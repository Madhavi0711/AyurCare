const { query, withTransaction } = require('../db');

async function getDashboard(req, res) {
  try {
    const [assessmentsResult, unassignedResult] = await Promise.all([
      query("SELECT COUNT(*) AS count FROM prakriti_results WHERE status = 'pending'"),
      query(
        `SELECT COUNT(*) AS count FROM users
         WHERE role = 'client'
         AND id NOT IN (SELECT DISTINCT user_id FROM yoga_plan_assignments)`
      ),
    ]);
    return res.json({
      pendingAssessments: parseInt(assessmentsResult.rows[0].count, 10),
      unassignedPlans: parseInt(unassignedResult.rows[0].count, 10),
    });
  } catch (err) {
    console.error('admin getDashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listClients(req, res) {
  try {
    const result = await query(
      `SELECT id, name, email, membership_type, created_at FROM users WHERE role = 'client' ORDER BY name`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('admin listClients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function searchClients(req, res) {
  const q = (req.query.q || '').trim();
  try {
    let result;
    if (!q) {
      result = await query(
        `SELECT id, name, email, membership_type, created_at FROM users WHERE role = 'client' ORDER BY name`
      );
    } else {
      result = await query(
        `SELECT id, name, email, membership_type, created_at FROM users
         WHERE role = 'client' AND (name ILIKE $1 OR email ILIKE $1) ORDER BY name`,
        [`%${q}%`]
      );
    }
    return res.json(result.rows);
  } catch (err) {
    console.error('admin searchClients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getClientDetail(req, res) {
  const clientId = parseInt(req.params.id, 10);
  if (isNaN(clientId)) return res.status(400).json({ error: 'Invalid client ID' });
  try {
    const [userResult, prakritiResult, dietResult, yogaResult, notifResult] = await Promise.all([
      query(`SELECT id, name, email, membership_type, created_at FROM users WHERE id = $1 AND role = 'client'`, [clientId]),
      query(`SELECT * FROM prakriti_results WHERE user_id = $1 ORDER BY created_at DESC`, [clientId]),
      query(`SELECT * FROM diet_recommendations WHERE customized_for = $1 ORDER BY created_at DESC`, [clientId]),
      query(
        `SELECT ypa.*, ys.title, ys.category FROM yoga_plan_assignments ypa
         JOIN yoga_sessions ys ON ys.id = ypa.yoga_session_id
         WHERE ypa.user_id = $1 ORDER BY ypa.created_at DESC`,
        [clientId]
      ),
      query(`SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`, [clientId]),
    ]);
    if (!userResult.rows[0]) return res.status(404).json({ error: 'Client not found' });
    return res.json({
      user: userResult.rows[0],
      prakritiResults: prakritiResult.rows,
      dietRecommendations: dietResult.rows,
      yogaAssignments: yogaResult.rows,
      notifications: notifResult.rows,
    });
  } catch (err) {
    console.error('admin getClientDetail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listPendingPrakriti(req, res) {
  try {
    const result = await query(
      `SELECT pr.*, u.name AS client_name, u.email AS client_email
       FROM prakriti_results pr JOIN users u ON u.id = pr.user_id
       WHERE pr.status = 'pending' ORDER BY pr.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('admin listPendingPrakriti error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listAllPrakriti(req, res) {
  try {
    const result = await query(
      `SELECT pr.*, u.name AS client_name, u.email AS client_email, u.membership_type
       FROM prakriti_results pr JOIN users u ON u.id = pr.user_id
       ORDER BY pr.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('admin listAllPrakriti error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function approvePrakriti(req, res) {
  const resultId = parseInt(req.params.id, 10);
  if (isNaN(resultId)) return res.status(400).json({ error: 'Invalid result ID' });
  try {
    const updated = await withTransaction(async (client) => {
      const result = await client.query(
        `UPDATE prakriti_results SET status = 'approved', approved_by = $1, approved_at = NOW()
         WHERE id = $2 RETURNING *`,
        [req.session.user.id, resultId]
      );
      const row = result.rows[0];
      if (!row) return null;
      await client.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
        [row.user_id, 'Your Prakriti assessment has been approved. Your dominant type is ' + row.dominant_type + '.']
      );
      return row;
    });
    if (!updated) return res.status(404).json({ error: 'Prakriti result not found' });
    return res.json(updated);
  } catch (err) {
    console.error('admin approvePrakriti error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function modifyPrakriti(req, res) {
  const resultId = parseInt(req.params.id, 10);
  if (isNaN(resultId)) return res.status(400).json({ error: 'Invalid result ID' });
  try {
    const existing = await query('SELECT * FROM prakriti_results WHERE id = $1', [resultId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Prakriti result not found' });
    const row = existing.rows[0];
    const vata  = req.body.vata_score  !== undefined ? parseInt(req.body.vata_score,  10) : row.vata_score;
    const pitta = req.body.pitta_score !== undefined ? parseInt(req.body.pitta_score, 10) : row.pitta_score;
    const kapha = req.body.kapha_score !== undefined ? parseInt(req.body.kapha_score, 10) : row.kapha_score;
    if (isNaN(vata) || isNaN(pitta) || isNaN(kapha)) {
      return res.status(400).json({ error: 'Scores must be numeric' });
    }
    const dominant_type = vata >= pitta && vata >= kapha ? 'vata' : pitta >= kapha ? 'pitta' : 'kapha';
    const updated = await query(
      `UPDATE prakriti_results
       SET vata_score = $1, pitta_score = $2, kapha_score = $3,
           dominant_type = $4, approved_by = $5, approved_at = NOW()
       WHERE id = $6 RETURNING *`,
      [vata, pitta, kapha, dominant_type, req.session.user.id, resultId]
    );
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error('admin modifyPrakriti error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function listDietClients(req, res) {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.membership_type,
              dr.id AS diet_id, dr.prakriti_type, dr.recommended_foods,
              dr.avoid_foods, dr.lifestyle_tips, dr.customized_at
       FROM users u
       LEFT JOIN diet_recommendations dr ON dr.customized_for = u.id
         AND dr.id = (SELECT id FROM diet_recommendations WHERE customized_for = u.id ORDER BY created_at DESC LIMIT 1)
       WHERE u.role = 'client' ORDER BY u.membership_type DESC, u.name`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('admin listDietClients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildReportsQuery(startDate, endDate, prakritiType, planType) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (startDate)    { conditions.push('pr.created_at >= $' + idx++); params.push(startDate); }
  if (endDate)      { conditions.push('pr.created_at <= $' + idx++); params.push(endDate); }
  if (prakritiType) { conditions.push('pr.dominant_type = $' + idx++); params.push(prakritiType); }
  if (planType)     { conditions.push('s.plan_name = $' + idx++); params.push(planType); }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const sql = `
    SELECT u.name AS client_name, u.email AS client_email,
      pr.dominant_type, pr.status AS prakriti_status, pr.created_at AS assessment_date,
      dr.recommended_foods AS diet_summary,
      COUNT(DISTINCT ypa.id) AS yoga_assignment_count,
      s.plan_name AS subscription_plan
    FROM prakriti_results pr
    JOIN users u ON u.id = pr.user_id
    LEFT JOIN diet_recommendations dr ON dr.customized_for = pr.user_id
      AND dr.id = (SELECT id FROM diet_recommendations WHERE customized_for = pr.user_id ORDER BY created_at DESC LIMIT 1)
    LEFT JOIN yoga_plan_assignments ypa ON ypa.user_id = pr.user_id
    LEFT JOIN subscriptions s ON s.user_id = pr.user_id
      AND s.id = (SELECT id FROM subscriptions WHERE user_id = pr.user_id ORDER BY valid_from DESC LIMIT 1)
    ${where}
    GROUP BY u.name, u.email, pr.dominant_type, pr.status, pr.created_at, dr.recommended_foods, s.plan_name
    ORDER BY pr.created_at ASC
  `;
  return { sql, params };
}

async function getReports(req, res) {
  const { startDate, endDate, prakritiType, planType } = req.query;
  const { sql, params } = buildReportsQuery(startDate, endDate, prakritiType, planType);
  try {
    const result = await query(sql, params);
    return res.json(result.rows);
  } catch (err) {
    console.error('admin getReports error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function exportReports(req, res) {
  const { startDate, endDate, prakritiType, planType } = req.query;
  const { sql, params } = buildReportsQuery(startDate, endDate, prakritiType, planType);
  try {
    const result = await query(sql, params);
    const rows = result.rows;
    const headers = ['Client Name','Email','Prakriti Type','Status','Assessment Date','Diet Summary','Yoga Assignments','Subscription Plan'];
    function escapeCsv(val) {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"';
      return str;
    }
    const csvLines = [
      headers.join(','),
      ...rows.map(r => [
        escapeCsv(r.client_name), escapeCsv(r.client_email), escapeCsv(r.dominant_type),
        escapeCsv(r.prakriti_status), escapeCsv(r.assessment_date), escapeCsv(r.diet_summary),
        escapeCsv(r.yoga_assignment_count), escapeCsv(r.subscription_plan),
      ].join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ayurcare-report.csv"');
    return res.send(csvLines.join('\r\n'));
  } catch (err) {
    console.error('admin exportReports error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAnalytics(req, res) {
  try {
    const [distributionResult, dailyTestsResult, userActivityResult] = await Promise.all([
      query(`SELECT dominant_type, COUNT(*) AS count FROM prakriti_results WHERE status = 'approved' GROUP BY dominant_type`),
      query(`SELECT DATE(created_at) AS day, COUNT(*) AS count FROM prakriti_results WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day ASC`),
      query(`SELECT DATE(created_at) AS day, COUNT(DISTINCT user_id) AS count FROM prakriti_results WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY day ORDER BY day ASC`),
    ]);
    const prakritiDistribution = { vata: 0, pitta: 0, kapha: 0 };
    for (const row of distributionResult.rows) {
      if (row.dominant_type in prakritiDistribution) {
        prakritiDistribution[row.dominant_type] = parseInt(row.count, 10);
      }
    }
    return res.json({
      prakritiDistribution,
      dailyTests: dailyTestsResult.rows.map(r => ({ day: r.day, count: parseInt(r.count, 10) })),
      userActivity: userActivityResult.rows.map(r => ({ day: r.day, count: parseInt(r.count, 10) })),
    });
  } catch (err) {
    console.error('admin getAnalytics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


async function assignDietPlan(req, res) {
  const { user_id, prakriti_type, recommended_foods, avoid_foods, lifestyle_tips } = req.body;
  if (!user_id || !prakriti_type || !recommended_foods || !avoid_foods) {
    return res.status(400).json({ error: 'user_id, prakriti_type, recommended_foods, and avoid_foods are required' });
  }
  try {
    const inserted = await query(
      `INSERT INTO diet_recommendations (prakriti_type, recommended_foods, avoid_foods, lifestyle_tips, customized_for, customized_by, customized_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [prakriti_type, recommended_foods, avoid_foods, lifestyle_tips || null, user_id, req.session.user.id]
    );
    return res.status(201).json(inserted.rows[0]);
  } catch (err) {
    console.error('assignDietPlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getDashboard,
  listClients,
  searchClients,
  getClientDetail,
  listPendingPrakriti,
  listAllPrakriti,
  approvePrakriti,
  modifyPrakriti,
  listDietClients,
  assignDietPlan,
  getReports,
  exportReports,
  getAnalytics,
};
