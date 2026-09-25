import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse as csvParse } from 'csv-parse/sync';
import { getDb, saveDb } from './db.js';
import {
  analyzeFeedbackAI,
  analyzeWithFallback,
  discoverDatasetTaxonomy,
  generateProductSummaryAI,
  generateProductDecisionsAI,
} from './ai.js';
import { seedDatabase } from './seed.js';

export const apiRouter = Router();

// Configure multer for CSV upload (up to 30MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// Helper to run query and return typed array of objects
function queryAll<T = any>(db: any, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

/**
 * Resolve the active dataset:
 * If an explicit datasetId or productId is passed, use it.
 * Otherwise, pick the most recently uploaded dataset.
 */
function resolveDataset(db: any, requestedId?: string): { id: string; name: string } | null {
  if (requestedId && requestedId.trim()) {
    const cleanId = requestedId.trim();
    // Check in datasets table
    const ds = queryAll<{ id: string; name: string }>(
      db,
      'SELECT id, name FROM datasets WHERE id = ?;',
      [cleanId]
    )[0];
    if (ds) return ds;

    // Check in products table for backward compatibility
    const prod = queryAll<{ id: string; name: string }>(
      db,
      'SELECT id, name FROM products WHERE id = ?;',
      [cleanId]
    )[0];
    if (prod) return { id: prod.id, name: prod.name };
  }

  // Fallback to the newest dataset
  const newestDs = queryAll<{ id: string; name: string }>(
    db,
    'SELECT id, name FROM datasets ORDER BY created_at DESC LIMIT 1;'
  )[0];
  if (newestDs) return newestDs;

  // Fallback to newest product
  const newestProd = queryAll<{ id: string; name: string }>(
    db,
    'SELECT id, name FROM products ORDER BY created_at DESC LIMIT 1;'
  )[0];
  if (newestProd) return { id: newestProd.id, name: newestProd.name };

  return null;
}

// -------------------------------------------------------------
// DATASETS API
// -------------------------------------------------------------

apiRouter.get('/datasets', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const datasets = queryAll(
      db,
      'SELECT * FROM datasets ORDER BY created_at DESC;'
    );
    res.json(datasets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/datasets/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const ds = queryAll(db, 'SELECT * FROM datasets WHERE id = ?;', [id])[0];
    if (!ds) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    const counts = queryAll<{
      total: number;
      positive: number;
      neutral: number;
      negative: number;
      high_priority: number;
    }>(
      db,
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
       FROM feedback WHERE dataset_id = ?;`,
      [id]
    )[0];

    res.json({
      ...ds,
      metrics: counts || { total: 0, positive: 0, neutral: 0, negative: 0, high_priority: 0 },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/datasets/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    db.run('DELETE FROM feedback WHERE dataset_id = ?;', [id]);
    db.run('DELETE FROM decisions WHERE dataset_id = ?;', [id]);
    db.run('DELETE FROM reports WHERE dataset_id = ?;', [id]);
    db.run('DELETE FROM datasets WHERE id = ?;', [id]);
    saveDb();
    res.json({ message: 'Dataset and associated data deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PRODUCTS API (for backward compatibility)
// -------------------------------------------------------------

apiRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const products = queryAll(db, 'SELECT * FROM products ORDER BY created_at ASC;');
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CSV UPLOAD & FULL INTELLIGENCE IMPORT PIPELINE
// -------------------------------------------------------------

apiRouter.post('/upload/csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file provided' });
    }

    let fileContent = req.file.buffer.toString('utf-8');
    // Strip UTF-8 BOM if present
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }

    if (!fileContent.trim()) {
      return res.status(400).json({ error: 'Uploaded CSV file is empty' });
    }

    let records: any[] = [];
    try {
      records = csvParse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      });
    } catch (parseErr: any) {
      return res.status(400).json({ error: `Failed to parse CSV: ${parseErr.message}` });
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid data rows found in CSV' });
    }

    const db = await getDb();

    // Generate unique dataset ID
    const datasetId = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const originalName = req.file.originalname || 'uploaded_feedback.csv';
    const cleanDatasetName = (req.body.name as string) ||
      originalName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Intelligent column discovery
    const sampleRow = records[0];
    const keys = Object.keys(sampleRow);

    // 1. Text column detection
    let feedbackCol = keys.find(k =>
      /feedback|content|review|comment|text|message|description|note|thought|details|issue|problem|opinion|suggestion|body|summary/i.test(k)
    );

    // If header regex didn't match, pick the column with highest average string length across first 10 rows
    if (!feedbackCol) {
      let maxAvgLength = 0;
      for (const k of keys) {
        let totalLen = 0;
        let count = 0;
        for (let i = 0; i < Math.min(10, records.length); i++) {
          const val = String(records[i][k] || '').trim();
          if (val) {
            totalLen += val.length;
            count++;
          }
        }
        const avg = count > 0 ? totalLen / count : 0;
        if (avg > maxAvgLength) {
          maxAvgLength = avg;
          feedbackCol = k;
        }
      }
    }
    if (!feedbackCol) feedbackCol = keys[0];

    // 2. Rating column detection
    const ratingCol = keys.find(k => /rating|score|star|satisfaction|csat|nps|grade/i.test(k));

    // 3. Date column detection
    const dateCol = keys.find(k => /date|time|created|timestamp|day|submitted/i.test(k));

    // 4. Source column detection
    const sourceCol = keys.find(k => /source|channel|platform|origin|medium|type/i.test(k));

    // Gather valid raw texts for dynamic taxonomy extraction
    const rawTextsToAnalyze: string[] = [];
    for (const r of records) {
      const text = (r[feedbackCol] || '').trim();
      if (text.length >= 3) {
        rawTextsToAnalyze.push(text);
      }
    }

    if (rawTextsToAnalyze.length === 0) {
      return res.status(400).json({ error: 'No valid feedback text entries found in the detected text column.' });
    }

    // Insert dataset record with 'processing' status
    db.run(
      'INSERT INTO datasets (id, name, filename, row_count, analysis_status) VALUES (?, ?, ?, ?, ?);',
      [datasetId, cleanDatasetName, originalName, 0, 'processing']
    );

    // Discover the true topics and issue templates directly from this dataset's text!
    const taxonomy = await discoverDatasetTaxonomy(rawTextsToAnalyze, cleanDatasetName);
    const discoveredTopics = taxonomy.topics;

    let importedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    const seenTexts = new Set<string>();
    const previewImported: any[] = [];
    const negativeIssueCounts = new Map<string, { count: number; topic: string }>();

    for (const row of records) {
      const rawText = (row[feedbackCol] || '').trim();
      if (!rawText || rawText.length < 3) {
        invalidCount++;
        continue;
      }

      const lower = rawText.toLowerCase();
      if (seenTexts.has(lower)) {
        duplicateCount++;
        continue;
      }
      seenTexts.add(lower);

      // Parse rating
      let rating = 3;
      if (ratingCol && row[ratingCol]) {
        const parsed = parseInt(String(row[ratingCol]).trim(), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
          rating = parsed;
        } else if (!isNaN(parsed) && parsed > 5 && parsed <= 10) {
          rating = Math.round(parsed / 2);
        }
      }

      // Parse date
      let dateStr = new Date().toISOString().split('T')[0];
      if (dateCol && row[dateCol]) {
        const d = new Date(String(row[dateCol]).trim());
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      }

      // Source
      const source = sourceCol && row[sourceCol] ? String(row[sourceCol]).trim() : 'CSV Import';

      // Run dynamic AI analysis matching against the dataset's discovered topics
      const analysis = analyzeWithFallback(rawText, rating, discoveredTopics);
      const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      db.run(
        `INSERT INTO feedback (
          id, dataset_id, product_id, content, rating, source, date,
          sentiment, sentiment_score, sentiment_confidence,
          topic, priority, issue_group, ai_summary,
          detected_problem, possible_cause, user_impact, suggested_action
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          feedbackId,
          datasetId,
          datasetId, // Link product_id to datasetId for backward compatibility
          rawText,
          rating,
          source,
          dateStr,
          analysis.sentiment,
          analysis.sentiment_score,
          analysis.sentiment_confidence,
          analysis.topic,
          analysis.priority,
          analysis.issue_group,
          analysis.ai_summary,
          analysis.detected_problem,
          analysis.possible_cause,
          analysis.user_impact,
          analysis.suggested_action,
        ]
      );

      // Track negative recurring issues for decision generation
      if (analysis.sentiment === 'negative' && analysis.issue_group) {
        const current = negativeIssueCounts.get(analysis.issue_group);
        if (current) {
          current.count += 1;
        } else {
          negativeIssueCounts.set(analysis.issue_group, { count: 1, topic: analysis.topic });
        }
      }

      importedCount++;

      if (previewImported.length < 5) {
        previewImported.push({
          id: feedbackId,
          content: rawText,
          rating,
          source,
          date: dateStr,
          sentiment: analysis.sentiment,
          topic: analysis.topic,
          priority: analysis.priority,
          issue_group: analysis.issue_group,
        });
      }
    }

    // Generate initial tailored decisions based on the actual top issues in THIS dataset
    const topIssuesForDecisions = Array.from(negativeIssueCounts.entries())
      .map(([issue, data]) => ({ issue, count: data.count, topic: data.topic }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topIssuesForDecisions.length > 0) {
      const generatedDecisions = await generateProductDecisionsAI(cleanDatasetName, topIssuesForDecisions);
      for (const dec of generatedDecisions) {
        const decId = `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        db.run(
          `INSERT INTO decisions (
            id, dataset_id, product_id, title, affected_feature, priority, trend,
            supporting_feedback_count, suggested_action, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            decId,
            datasetId,
            datasetId,
            dec.title,
            dec.affected_feature,
            dec.priority,
            dec.trend,
            dec.supporting_feedback_count, // REAL COUNT FROM THIS DATASET!
            dec.suggested_action,
            'Planned',
          ]
        );
      }
    }

    // Update dataset record status to completed with real row count
    db.run(
      'UPDATE datasets SET row_count = ?, analysis_status = ?, name = ? WHERE id = ?;',
      [importedCount, 'completed', cleanDatasetName, datasetId]
    );

    saveDb();

    res.json({
      dataset_id: datasetId,
      name: cleanDatasetName,
      filename: originalName,
      total_rows: records.length,
      imported: importedCount,
      duplicates: duplicateCount,
      invalid: invalidCount,
      detected_columns: {
        feedback: feedbackCol,
        rating: ratingCol || null,
        date: dateCol || null,
        source: sourceCol || null,
      },
      topics_detected: discoveredTopics,
      preview_imported: previewImported,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD OVERVIEW (Strictly grounded in active dataset)
// -------------------------------------------------------------

apiRouter.get('/dashboard/overview', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));

    if (!dataset) {
      return res.json({
        total_feedback: 0,
        positive_percentage: 0,
        neutral_percentage: 0,
        negative_percentage: 0,
        positive_count: 0,
        neutral_count: 0,
        negative_count: 0,
        high_priority_issues: 0,
        trends: {
          total_change: '+0.0%',
          positive_change: '+0.0%',
          neutral_change: '+0.0%',
          negative_change: '+0.0%',
          high_priority_change: '+0.0%',
        },
        ai_takeaway: 'No feedback uploaded yet. Import a CSV file to generate feedback intelligence.',
      });
    }

    const dsId = dataset.id;

    const totalRows = queryAll<{ count: number }>(
      db,
      'SELECT COUNT(*) as count FROM feedback WHERE dataset_id = ? OR product_id = ?;',
      [dsId, dsId]
    )[0]?.count || 0;

    const sentimentRows = queryAll<{ sentiment: string; count: number }>(
      db,
      'SELECT sentiment, COUNT(*) as count FROM feedback WHERE dataset_id = ? OR product_id = ? GROUP BY sentiment;',
      [dsId, dsId]
    );

    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    for (const r of sentimentRows) {
      if (r.sentiment === 'positive') positiveCount = r.count;
      else if (r.sentiment === 'neutral') neutralCount = r.count;
      else if (r.sentiment === 'negative') negativeCount = r.count;
    }

    const highPriorityCount = queryAll<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM feedback WHERE (dataset_id = ? OR product_id = ?) AND priority = 'high';",
      [dsId, dsId]
    )[0]?.count || 0;

    const total = totalRows || 1;
    const positivePct = Math.round((positiveCount / total) * 100);
    const neutralPct = Math.round((neutralCount / total) * 100);
    const negativePct = Math.round((negativeCount / total) * 100);

    // Get top negative issue group and top positive topic from THIS dataset for dynamic takeaway
    const topNegIssue = queryAll<{ issue_group: string; count: number }>(
      db,
      `SELECT issue_group, COUNT(*) as count 
       FROM feedback 
       WHERE (dataset_id = ? OR product_id = ?) AND sentiment = 'negative' AND issue_group IS NOT NULL 
       GROUP BY issue_group 
       ORDER BY count DESC 
       LIMIT 1;`,
      [dsId, dsId]
    )[0];

    const topPosTopic = queryAll<{ topic: string; count: number }>(
      db,
      `SELECT topic, COUNT(*) as count 
       FROM feedback 
       WHERE (dataset_id = ? OR product_id = ?) AND sentiment = 'positive' 
       GROUP BY topic 
       ORDER BY count DESC 
       LIMIT 1;`,
      [dsId, dsId]
    )[0];

    // Dynamic AI takeaway based on the actual dataset
    let aiTakeaway = '';
    if (totalRows === 0) {
      aiTakeaway = `No feedback items found for ${dataset.name}. Upload a CSV file to begin analysis.`;
    } else if (positivePct >= 60) {
      aiTakeaway = `Strong user satisfaction for ${dataset.name} (${positivePct}% positive). Primary praise highlights ${topPosTopic?.topic || 'core features'}, with minimal friction reported.`;
    } else if (negativePct >= 35) {
      aiTakeaway = `Action required for ${dataset.name}: ${negativePct}% of feedback is negative. Major user friction concentrates around "${topNegIssue?.issue_group || 'reported issues'}".`;
    } else {
      aiTakeaway = `Feedback for ${dataset.name} is balanced (${positivePct}% positive, ${negativePct}% negative). Top area for product improvement is "${topNegIssue?.issue_group || 'user workflow friction'}".`;
    }

    // Calculate real trends based on date distribution in dataset
    const dateRows = queryAll<{ date: string; sentiment: string; priority: string }>(
      db,
      'SELECT date, sentiment, priority FROM feedback WHERE dataset_id = ? OR product_id = ? ORDER BY date ASC;',
      [dsId, dsId]
    );

    const mid = Math.floor(dateRows.length / 2);
    const firstHalf = dateRows.slice(0, mid);
    const secondHalf = dateRows.slice(mid);

    const calcDelta = (h1: number, h2: number) => {
      if (h1 === 0) return h2 > 0 ? '+100%' : '0%';
      const delta = ((h2 - h1) / h1) * 100;
      return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
    };

    const trends = {
      total_change: calcDelta(firstHalf.length, secondHalf.length),
      positive_change: calcDelta(
        firstHalf.filter(f => f.sentiment === 'positive').length,
        secondHalf.filter(f => f.sentiment === 'positive').length
      ),
      neutral_change: calcDelta(
        firstHalf.filter(f => f.sentiment === 'neutral').length,
        secondHalf.filter(f => f.sentiment === 'neutral').length
      ),
      negative_change: calcDelta(
        firstHalf.filter(f => f.sentiment === 'negative').length,
        secondHalf.filter(f => f.sentiment === 'negative').length
      ),
      high_priority_change: calcDelta(
        firstHalf.filter(f => f.priority === 'high').length,
        secondHalf.filter(f => f.priority === 'high').length
      ),
    };

    res.json({
      dataset_id: dsId,
      dataset_name: dataset.name,
      total_feedback: totalRows,
      positive_percentage: positivePct,
      neutral_percentage: neutralPct,
      negative_percentage: negativePct,
      positive_count: positiveCount,
      neutral_count: neutralCount,
      negative_count: negativeCount,
      high_priority_issues: highPriorityCount,
      trends,
      ai_takeaway: aiTakeaway,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD SENTIMENT
// -------------------------------------------------------------

apiRouter.get('/dashboard/sentiment', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));

    if (!dataset) {
      return res.json({
        breakdown: [
          { label: 'Positive', count: 0, percentage: 0, color: '#10b981' },
          { label: 'Neutral', count: 0, percentage: 0, color: '#94a3b8' },
          { label: 'Negative', count: 0, percentage: 0, color: '#ef4444' },
        ],
        total: 0,
        ai_interpretation: 'No feedback uploaded yet.',
      });
    }

    const dsId = dataset.id;
    const rows = queryAll<{ sentiment: string; count: number }>(
      db,
      'SELECT sentiment, COUNT(*) as count FROM feedback WHERE dataset_id = ? OR product_id = ? GROUP BY sentiment;',
      [dsId, dsId]
    );

    let positive = 0;
    let neutral = 0;
    let negative = 0;
    for (const r of rows) {
      if (r.sentiment === 'positive') positive = r.count;
      else if (r.sentiment === 'neutral') neutral = r.count;
      else if (r.sentiment === 'negative') negative = r.count;
    }

    const total = positive + neutral + negative || 1;
    const posPct = Math.round((positive / total) * 100);
    const neuPct = Math.round((neutral / total) * 100);
    const negPct = Math.round((negative / total) * 100);

    const topNeg = queryAll<{ issue_group: string }>(
      db,
      `SELECT issue_group FROM feedback WHERE (dataset_id = ? OR product_id = ?) AND sentiment = 'negative' GROUP BY issue_group ORDER BY COUNT(*) DESC LIMIT 1;`,
      [dsId, dsId]
    )[0];

    const interpretation =
      total <= 1
        ? `Sentiment baseline ready for ${dataset.name}.`
        : negPct > 30
        ? `Elevated negative sentiment (${negPct}%) across ${dataset.name}, primarily driven by "${topNeg?.issue_group || 'user friction'}".`
        : `Healthy sentiment distribution across ${dataset.name} with ${posPct}% positive remarks.`;

    res.json({
      breakdown: [
        { label: 'Positive', count: positive, percentage: posPct, color: '#10b981' },
        { label: 'Neutral', count: neutral, percentage: neuPct, color: '#94a3b8' },
        { label: 'Negative', count: negative, percentage: negPct, color: '#ef4444' },
      ],
      total: positive + neutral + negative,
      ai_interpretation: interpretation,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD TRENDS (TIME-SERIES)
// -------------------------------------------------------------

apiRouter.get('/dashboard/trends', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));

    if (!dataset) {
      return res.json({ period: '30d', trends: [] });
    }

    const dsId = dataset.id;
    const period = (req.query.period as string) || '30d';

    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '3m') days = 90;
    else if (period === '1y') days = 365;

    // Fetch dates and counts from actual dataset
    const rows = queryAll<{ date: string; sentiment: string; count: number }>(
      db,
      `SELECT date, sentiment, COUNT(*) as count 
       FROM feedback 
       WHERE dataset_id = ? OR product_id = ? 
       GROUP BY date, sentiment 
       ORDER BY date ASC;`,
      [dsId, dsId]
    );

    const dateMap: Record<string, { date: string; total: number; positive: number; negative: number; neutral: number }> = {};

    // If rows exist, populate map with actual feedback dates
    if (rows.length > 0) {
      for (const r of rows) {
        if (!dateMap[r.date]) {
          dateMap[r.date] = { date: r.date, total: 0, positive: 0, negative: 0, neutral: 0 };
        }
        if (r.sentiment === 'positive') dateMap[r.date].positive += r.count;
        else if (r.sentiment === 'negative') dateMap[r.date].negative += r.count;
        else if (r.sentiment === 'neutral') dateMap[r.date].neutral += r.count;
        dateMap[r.date].total += r.count;
      }
    } else {
      // Generate empty timeline
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const str = d.toISOString().split('T')[0];
        dateMap[str] = { date: str, total: 0, positive: 0, negative: 0, neutral: 0 };
      }
    }

    const trends = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
    res.json({ period, trends });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD TOPICS / TOP ISSUES
// -------------------------------------------------------------

apiRouter.get('/dashboard/topics', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));

    if (!dataset) {
      return res.json({ topics: [], top_issues: [] });
    }

    const dsId = dataset.id;

    // Real topic aggregates
    const topicRows = queryAll<{
      topic: string;
      total: number;
      positive: number;
      negative: number;
      high_priority: number;
    }>(
      db,
      `SELECT 
        topic,
        COUNT(*) as total,
        SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
       FROM feedback
       WHERE dataset_id = ? OR product_id = ?
       GROUP BY topic
       ORDER BY total DESC;`,
      [dsId, dsId]
    );

    // Real issue group aggregates
    const issueRows = queryAll<{
      issue_group: string;
      topic: string;
      count: number;
      negative: number;
      high_priority: number;
    }>(
      db,
      `SELECT 
        issue_group,
        topic,
        COUNT(*) as count,
        SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
       FROM feedback
       WHERE (dataset_id = ? OR product_id = ?) AND issue_group IS NOT NULL AND issue_group != ''
       GROUP BY issue_group
       ORDER BY count DESC
       LIMIT 8;`,
      [dsId, dsId]
    );

    const topIssues = issueRows.map((r, index) => {
      const negRatio = r.negative / (r.count || 1);
      const sentiment = negRatio >= 0.5 ? 'Negative' : negRatio >= 0.2 ? 'Neutral' : 'Positive';
      const priority = r.high_priority > 0 || negRatio > 0.6 ? 'High' : 'Medium';
      const trend = `${r.count} reports`;

      return {
        rank: index + 1,
        issue_name: r.issue_group,
        topic: r.topic,
        feedback_count: r.count, // REAL COUNT!
        sentiment,
        priority,
        trend,
        negative_percentage: Math.round(negRatio * 100),
      };
    });

    res.json({
      topics: topicRows,
      top_issues: topIssues,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// FEEDBACK LIST & SEARCH & FILTERS
// -------------------------------------------------------------

apiRouter.get('/feedback', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));

    if (!dataset) {
      return res.json({
        items: [],
        pagination: { page: 1, limit: 15, total: 0, total_pages: 1 },
      });
    }

    const dsId = dataset.id;
    const search = ((req.query.search as string) || '').trim().toLowerCase();
    const sentiment = (req.query.sentiment as string) || '';
    const topic = (req.query.topic as string) || '';
    const priority = (req.query.priority as string) || '';
    const source = (req.query.source as string) || '';
    const rating = req.query.rating ? parseInt(req.query.rating as string, 10) : undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '15', 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['(dataset_id = ? OR product_id = ?)'];
    const params: any[] = [dsId, dsId];

    if (search) {
      conditions.push('(LOWER(content) LIKE ? OR LOWER(topic) LIKE ? OR LOWER(source) LIKE ? OR LOWER(issue_group) LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern);
    }
    if (sentiment) {
      conditions.push('sentiment = ?');
      params.push(sentiment.toLowerCase());
    }
    if (topic) {
      conditions.push('topic = ?');
      params.push(topic);
    }
    if (priority) {
      conditions.push('priority = ?');
      params.push(priority.toLowerCase());
    }
    if (source) {
      conditions.push('source = ?');
      params.push(source);
    }
    if (rating && !isNaN(rating)) {
      conditions.push('rating = ?');
      params.push(rating);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Total matching count
    const countSql = `SELECT COUNT(*) as total FROM feedback ${whereClause};`;
    const totalCount = queryAll<{ total: number }>(db, countSql, params)[0]?.total || 0;

    // Items page
    const itemsSql = `SELECT * FROM feedback ${whereClause} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?;`;
    const items = queryAll(db, itemsSql, [...params, limit, offset]);

    res.json({
      items,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// FEEDBACK DETAILS
// -------------------------------------------------------------

apiRouter.get('/feedback/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const rows = queryAll(db, 'SELECT * FROM feedback WHERE id = ?;', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Feedback item not found' });
    }

    const item = rows[0];
    const dsId = item.dataset_id || item.product_id;

    // Find similar feedback items in the same issue group or topic
    const related = queryAll(
      db,
      'SELECT id, content, sentiment, priority, date FROM feedback WHERE (dataset_id = ? OR product_id = ?) AND topic = ? AND id != ? LIMIT 4;',
      [dsId, dsId, item.topic, item.id]
    );

    res.json({
      feedback: item,
      related_feedback: related,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// POST FEEDBACK (CREATE & ANALYZE)
// -------------------------------------------------------------

apiRouter.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { content, rating, source, dataset_id, product_id, date } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const db = await getDb();
    const dataset = resolveDataset(db, dataset_id || product_id);
    const dsId = dataset ? dataset.id : 'ds_manual';
    const dateStr = date || new Date().toISOString().split('T')[0];
    const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Get existing topics for this dataset
    const existingTopics = queryAll<{ topic: string }>(
      db,
      'SELECT DISTINCT topic FROM feedback WHERE dataset_id = ? OR product_id = ?;',
      [dsId, dsId]
    ).map(r => r.topic);

    const analysis = await analyzeFeedbackAI(content, rating, existingTopics);

    db.run(
      `INSERT INTO feedback (
        id, dataset_id, product_id, content, rating, source, date,
        sentiment, sentiment_score, sentiment_confidence,
        topic, priority, issue_group, ai_summary,
        detected_problem, possible_cause, user_impact, suggested_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        dsId,
        dsId,
        content,
        rating || 3,
        source || 'Website',
        dateStr,
        analysis.sentiment,
        analysis.sentiment_score,
        analysis.sentiment_confidence,
        analysis.topic,
        analysis.priority,
        analysis.issue_group,
        analysis.ai_summary,
        analysis.detected_problem,
        analysis.possible_cause,
        analysis.user_impact,
        analysis.suggested_action,
      ]
    );
    saveDb();

    res.status(201).json({
      id,
      dataset_id: dsId,
      product_id: dsId,
      content,
      rating: rating || 3,
      source: source || 'Website',
      date: dateStr,
      ...analysis,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DELETE FEEDBACK
// -------------------------------------------------------------

apiRouter.delete('/feedback/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    db.run('DELETE FROM feedback WHERE id = ?;', [id]);
    saveDb();
    res.json({ message: 'Feedback deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AD-HOC AI ANALYSIS: SENTIMENT
// -------------------------------------------------------------

apiRouter.post('/analysis/sentiment', async (req: Request, res: Response) => {
  try {
    const { text, rating } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });
    const result = await analyzeFeedbackAI(text, rating);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AD-HOC AI ANALYSIS: TOPICS
// -------------------------------------------------------------

apiRouter.post('/analysis/topics', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.body.datasetId as string) || (req.body.productId as string));
    if (!dataset) return res.json({ topics: [] });

    const topics = queryAll(
      db,
      'SELECT topic, COUNT(*) as count FROM feedback WHERE dataset_id = ? OR product_id = ? GROUP BY topic ORDER BY count DESC;',
      [dataset.id, dataset.id]
    );
    res.json({ topics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AI SUMMARY API (POST /api/analysis/summary)
// -------------------------------------------------------------

apiRouter.post('/analysis/summary', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.body.datasetId as string) || (req.body.productId as string));

    if (!dataset) {
      return res.json({
        overall_summary: 'No dataset uploaded yet.',
        positive_points: [],
        negative_points: [],
        top_problems: [],
        emerging_trends: [],
        recommended_actions: [],
      });
    }

    const items = queryAll<{ content: string; sentiment: string; topic: string; priority: string; rating?: number; issue_group?: string }>(
      db,
      'SELECT content, sentiment, topic, priority, rating, issue_group FROM feedback WHERE dataset_id = ? OR product_id = ? ORDER BY date DESC LIMIT 80;',
      [dataset.id, dataset.id]
    );

    const summary = await generateProductSummaryAI(dataset.name, items);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AI DECISIONS API (POST /api/analysis/decisions)
// -------------------------------------------------------------

apiRouter.post('/analysis/decisions', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.body.datasetId as string) || (req.body.productId as string));

    if (!dataset) {
      return res.json({ decisions: [] });
    }

    const issueRows = queryAll<{ issue_group: string; topic: string; count: number }>(
      db,
      `SELECT issue_group, topic, COUNT(*) as count 
       FROM feedback 
       WHERE (dataset_id = ? OR product_id = ?) AND issue_group IS NOT NULL AND sentiment = 'negative'
       GROUP BY issue_group 
       ORDER BY count DESC 
       LIMIT 6;`,
      [dataset.id, dataset.id]
    );

    const topIssues = issueRows.map(r => ({
      issue: r.issue_group,
      count: r.count,
      topic: r.topic,
    }));

    const decisions = await generateProductDecisionsAI(dataset.name, topIssues);
    res.json({ decisions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DECISIONS CRUD
// -------------------------------------------------------------

apiRouter.get('/decisions', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));

    if (!dataset) {
      return res.json([]);
    }

    const status = (req.query.status as string) || '';
    const priority = (req.query.priority as string) || '';

    const conditions = ['(dataset_id = ? OR product_id = ?)'];
    const params: any[] = [dataset.id, dataset.id];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (priority) {
      conditions.push('priority = ?');
      params.push(priority.toLowerCase());
    }

    const sql = `SELECT * FROM decisions WHERE ${conditions.join(' AND ')} ORDER BY 
      CASE priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END, created_at DESC;`;

    const decisions = queryAll(db, sql, params);
    res.json(decisions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/decisions', async (req: Request, res: Response) => {
  try {
    const {
      dataset_id,
      product_id,
      title,
      affected_feature,
      priority,
      trend,
      supporting_feedback_count,
      suggested_action,
      status,
    } = req.body;

    if (!title || !affected_feature) {
      return res.status(400).json({ error: 'Title and affected_feature are required' });
    }

    const db = await getDb();
    const dataset = resolveDataset(db, dataset_id || product_id);
    const dsId = dataset ? dataset.id : 'ds_default';
    const id = `dec_${Date.now()}`;

    db.run(
      `INSERT INTO decisions (
        id, dataset_id, product_id, title, affected_feature, priority, trend,
        supporting_feedback_count, suggested_action, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        dsId,
        dsId,
        title,
        affected_feature,
        priority || 'medium',
        trend || 'increasing',
        supporting_feedback_count || 1,
        suggested_action || '',
        status || 'Planned',
      ]
    );
    saveDb();

    res.status(201).json({
      id,
      dataset_id: dsId,
      product_id: dsId,
      title,
      affected_feature,
      priority: priority || 'medium',
      trend: trend || 'increasing',
      supporting_feedback_count: supporting_feedback_count || 1,
      suggested_action: suggested_action || '',
      status: status || 'Planned',
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/decisions/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { status, priority, title, suggested_action, trend } = req.body;

    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (priority) {
      updates.push('priority = ?');
      params.push(priority.toLowerCase());
    }
    if (title) {
      updates.push('title = ?');
      params.push(title);
    }
    if (suggested_action !== undefined) {
      updates.push('suggested_action = ?');
      params.push(suggested_action);
    }
    if (trend) {
      updates.push('trend = ?');
      params.push(trend);
    }

    params.push(id);
    db.run(`UPDATE decisions SET ${updates.join(', ')} WHERE id = ?;`, params);
    saveDb();

    const updated = queryAll(db, 'SELECT * FROM decisions WHERE id = ?;', [id])[0];
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/decisions/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    db.run('DELETE FROM decisions WHERE id = ?;', [id]);
    saveDb();
    res.json({ message: 'Decision deleted', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REPORTS
// -------------------------------------------------------------

apiRouter.post('/reports/generate', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.body.datasetId as string) || (req.body.productId as string));

    if (!dataset) {
      return res.status(400).json({ error: 'No active dataset found to generate report' });
    }

    const dsId = dataset.id;
    const period = (req.body.period as string) || '30d';

    const feedbackItems = queryAll<{
      content: string;
      sentiment: string;
      topic: string;
      priority: string;
      rating: number;
      issue_group: string;
    }>(
      db,
      'SELECT content, sentiment, topic, priority, rating, issue_group FROM feedback WHERE dataset_id = ? OR product_id = ? ORDER BY date DESC;',
      [dsId, dsId]
    );

    const totalFeedback = feedbackItems.length;
    const positiveCount = feedbackItems.filter(f => f.sentiment === 'positive').length;
    const neutralCount = feedbackItems.filter(f => f.sentiment === 'neutral').length;
    const negativeCount = feedbackItems.filter(f => f.sentiment === 'negative').length;
    const avgRating = totalFeedback
      ? Number(
          (feedbackItems.reduce((acc, f) => acc + (f.rating || 3), 0) / totalFeedback).toFixed(2)
        )
      : 4.0;

    // Generate AI executive synthesis for this dataset
    const aiSummary = await generateProductSummaryAI(dataset.name, feedbackItems);

    // Active decisions for this dataset
    const decisions = queryAll(
      db,
      'SELECT * FROM decisions WHERE dataset_id = ? OR product_id = ? ORDER BY created_at DESC;',
      [dsId, dsId]
    );

    // Real topic distribution
    const topicMap: Record<string, number> = {};
    for (const f of feedbackItems) {
      topicMap[f.topic] = (topicMap[f.topic] || 0) + 1;
    }
    const topTopics = Object.entries(topicMap)
      .map(([name, count]) => ({ name, count, percentage: Math.round((count / (totalFeedback || 1)) * 100) }))
      .sort((a, b) => b.count - a.count);

    const reportContent = {
      product_name: dataset.name,
      analysis_period: period.toUpperCase(),
      generated_at: new Date().toISOString(),
      metrics: {
        total_feedback: totalFeedback,
        average_rating: avgRating,
        positive_percentage: Math.round((positiveCount / (totalFeedback || 1)) * 100),
        neutral_percentage: Math.round((neutralCount / (totalFeedback || 1)) * 100),
        negative_percentage: Math.round((negativeCount / (totalFeedback || 1)) * 100),
        high_priority_issues: feedbackItems.filter(f => f.priority === 'high').length,
      },
      sentiment_distribution: {
        positive: positiveCount,
        neutral: neutralCount,
        negative: negativeCount,
      },
      top_topics: topTopics,
      ai_summary: aiSummary,
      product_decisions: decisions,
    };

    const id = `rep_${Date.now()}`;
    const title = `${dataset.name} Intelligence Report - ${period.toUpperCase()}`;

    db.run(
      'INSERT INTO reports (id, dataset_id, product_id, title, period, content_json) VALUES (?, ?, ?, ?, ?, ?);',
      [id, dsId, dsId, title, period, JSON.stringify(reportContent)]
    );
    saveDb();

    res.status(201).json({
      id,
      title,
      period,
      created_at: new Date().toISOString(),
      report: reportContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));
    if (!dataset) return res.json([]);

    const rows = queryAll(
      db,
      'SELECT id, dataset_id, title, period, created_at FROM reports WHERE dataset_id = ? OR product_id = ? ORDER BY created_at DESC;',
      [dataset.id, dataset.id]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const rows = queryAll(db, 'SELECT * FROM reports WHERE id = ?;', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Report not found' });
    }
    const reportRow = rows[0];
    res.json({
      id: reportRow.id,
      title: reportRow.title,
      period: reportRow.period,
      created_at: reportRow.created_at,
      report: JSON.parse(reportRow.content_json),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// NOTIFICATIONS API (Dynamic alerts based on active dataset)
// -------------------------------------------------------------

apiRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const dataset = resolveDataset(db, (req.query.datasetId as string) || (req.query.productId as string));

    if (!dataset) {
      return res.json({ alerts: [] });
    }

    const highPriorityIssues = queryAll<{ issue_group: string; count: number; topic: string }>(
      db,
      `SELECT issue_group, topic, COUNT(*) as count 
       FROM feedback 
       WHERE (dataset_id = ? OR product_id = ?) AND priority = 'high' AND issue_group IS NOT NULL 
       GROUP BY issue_group 
       ORDER BY count DESC 
       LIMIT 3;`,
      [dataset.id, dataset.id]
    );

    const alerts = highPriorityIssues.map(issue => ({
      title: `High Priority Issue in ${issue.topic}`,
      description: `${issue.count} user feedback report${issue.count > 1 ? 's' : ''} on "${issue.issue_group}".`,
      severity: issue.count >= 3 ? 'Critical' : 'High',
    }));

    res.json({ alerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SEED RESET UTILITY
// -------------------------------------------------------------

apiRouter.post('/seed/reset', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    db.run('DELETE FROM feedback;');
    db.run('DELETE FROM decisions;');
    db.run('DELETE FROM reports;');
    db.run('DELETE FROM products;');
    db.run('DELETE FROM datasets;');
    await seedDatabase(db);
    res.json({ message: 'Database reset and re-seeded with demo data successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
