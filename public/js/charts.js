/* global Chart */
// AYURCARE Analytics Charts
// Requires Chart.js loaded from CDN before this script.

var AyurCharts = (function () {
  var instances = {};

  /**
   * Destroy an existing chart instance if present.
   * @param {string} canvasId
   */
  function destroyIfExists(canvasId) {
    if (instances[canvasId]) {
      instances[canvasId].destroy();
      delete instances[canvasId];
    }
  }

  /**
   * Render a doughnut chart showing Prakriti distribution.
   * @param {string} canvasId
   * @param {{ vata: number, pitta: number, kapha: number }} data
   */
  function renderPrakritiPie(canvasId, data) {
    destroyIfExists(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;

    instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Vata', 'Pitta', 'Kapha'],
        datasets: [{
          data: [data.vata || 0, data.pitta || 0, data.kapha || 0],
          backgroundColor: ['#d1ecf1', '#fde8d8', '#e2d9f3'],
          borderColor: ['#0c5460', '#7a3a00', '#3d1a78'],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: function (context) {
                var total = context.dataset.data.reduce(function (a, b) { return a + b; }, 0);
                var pct = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                return context.label + ': ' + context.parsed + ' (' + pct + '%)';
              },
            },
          },
        },
      },
    });
  }

  /**
   * Render a bar chart showing daily assessment submissions.
   * @param {string} canvasId
   * @param {Array<{ day: string, count: number }>} data
   */
  function renderDailyTests(canvasId, data) {
    destroyIfExists(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;

    var labels = data.map(function (d) { return d.day; });
    var counts = data.map(function (d) { return d.count; });

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Assessments',
          data: counts,
          backgroundColor: 'rgba(200, 169, 110, 0.7)',
          borderColor: '#c8a96e',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: { maxRotation: 45, minRotation: 30 },
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  /**
   * Render a line chart showing active users per day.
   * @param {string} canvasId
   * @param {Array<{ day: string, count: number }>} data
   */
  function renderUserActivity(canvasId, data) {
    destroyIfExists(canvasId);
    var ctx = document.getElementById(canvasId);
    if (!ctx) return;

    var labels = data.map(function (d) { return d.day; });
    var counts = data.map(function (d) { return d.count; });

    instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Active Users',
          data: counts,
          fill: true,
          backgroundColor: 'rgba(90, 62, 40, 0.1)',
          borderColor: '#5a3e28',
          pointBackgroundColor: '#5a3e28',
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: { maxRotation: 45, minRotation: 30 },
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  return {
    renderPrakritiPie: renderPrakritiPie,
    renderDailyTests: renderDailyTests,
    renderUserActivity: renderUserActivity,
  };
}());
