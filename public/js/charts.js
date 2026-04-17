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

    var vata  = data.vata  || 0;
    var pitta = data.pitta || 0;
    var kapha = data.kapha || 0;

    instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Vata', 'Pitta', 'Kapha'],
        datasets: [{
          label: 'Assessments',
          data: [vata, pitta, kapha],
          backgroundColor: ['#4db6c8', '#e07040', '#8b6abf'],
          borderColor: ['#0c5460', '#7a3a00', '#3d1a78'],
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.label + ': ' + context.parsed.y + ' users';
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

// Tier distribution bar chart — added outside IIFE, uses Chart.js directly
AyurCharts.renderTierDistribution = function(canvasId, data) {
  // Destroy existing chart if any
  if (AyurCharts._tierChart) { AyurCharts._tierChart.destroy(); AyurCharts._tierChart = null; }
  var ctx = document.getElementById(canvasId);
  if (!ctx) return;
  AyurCharts._tierChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Free', 'Gold', 'Platinum'],
      datasets: [{
        label: 'Users',
        data: [data.free || 0, data.gold || 0, data.platinum || 0],
        backgroundColor: ['#f0e8dc', '#fff3cd', '#e2d9f3'],
        borderColor: ['#562F00', '#b8860b', '#3d1a78'],
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      plugins: { legend: { display: false } },
    },
  });
};
