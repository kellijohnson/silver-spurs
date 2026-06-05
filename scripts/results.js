const resultsSearch = document.getElementById('results-search');
const resultsEventFilter = document.getElementById('results-event-filter');
const resultsClassFilter = document.getElementById('results-class-filter');
const resultsSummary = document.getElementById('results-summary');
const resultsTable = document.getElementById('results-table');
const embeddedResultsData = document.getElementById('results-data');
let resultsData = [];

const formatCell = (value) => value === null || value === undefined || value === '' ? '-' : value;

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return `$${Number(value).toFixed(2)}`;
};

const createTable = (data) => {
  if (!data.length) {
    return '<p>No results match the current search or filter.</p>';
  }

  const rows = data.map((row) => `
    <tr>
      <td>${formatCell(row.event)}</td>
      <td>${formatCell(row.date)}</td>
      <td>${formatCell(row.venue)}</td>
      <td>${formatCell(row.division)}</td>
      <td>${formatCell(row.rider)}</td>
      <td>${formatCell(row.horse)}</td>
      <td>${formatCell(row.time)}</td>
      <td>${formatCell(row.place)}</td>
      <td>${formatMoney(row.money)}</td>
    </tr>
  `).join('');

  return `
    <table class="results-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Date</th>
          <th>Venue</th>
          <th>D</th>
          <th>Rider</th>
          <th>Horse</th>
          <th>Time</th>
          <th>Place</th>
          <th>$</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const updateSummary = (count, total) => {
  resultsSummary.textContent = `${count} result${count === 1 ? '' : 's'} displayed from ${total} total entries.`;
};

const filterResults = () => {
  const query = resultsSearch.value.toLowerCase().trim();
  const eventFilter = resultsEventFilter.value;
  const classFilter = resultsClassFilter.value;

  return resultsData.filter((row) => {
    const matchEvent = !eventFilter || row.event === eventFilter;
    const matchClass = !classFilter || row.class === classFilter;
    const matchQuery = !query || [row.event, row.venue, row.division, row.rider, row.horse].some((field) =>
      String(field || '').toLowerCase().includes(query)
    );
    return matchEvent && matchClass && matchQuery;
  });
};

const populateEventOptions = (data) => {
  resultsEventFilter.innerHTML = '<option value="">All events</option>';
  const events = Array.from(new Set(data.map((row) => row.event))).sort();
  events.forEach((event) => {
    const option = document.createElement('option');
    option.value = event;
    option.textContent = event;
    resultsEventFilter.appendChild(option);
  });
};

const populateClassOptions = (data) => {
  resultsClassFilter.innerHTML = '<option value="">All classes</option>';
  const classes = Array.from(new Set(data.map((row) => row.class).filter(Boolean))).sort();
  classes.forEach((resultClass) => {
    const option = document.createElement('option');
    option.value = resultClass;
    option.textContent = resultClass;
    resultsClassFilter.appendChild(option);
  });
};

const renderResults = () => {
  const filtered = filterResults();
  resultsTable.innerHTML = createTable(filtered);
  updateSummary(filtered.length, resultsData.length);
};

const loadResults = async () => {
  if (embeddedResultsData && embeddedResultsData.textContent.trim()) {
    try {
      resultsData = JSON.parse(embeddedResultsData.textContent);
      populateEventOptions(resultsData);
      populateClassOptions(resultsData);
      renderResults();
      return;
    } catch (error) {
      console.warn('Invalid embedded results data. Falling back to fetch.', error);
    }
  }

  try {
    const response = await fetch('data/results.json');
    if (!response.ok) {
      throw new Error('Failed to load results data');
    }
    resultsData = await response.json();
    populateEventOptions(resultsData);
    populateClassOptions(resultsData);
    renderResults();
  } catch (error) {
    resultsSummary.textContent = 'Unable to load results. Please try again later.';
    resultsTable.innerHTML = '';
    console.error(error);
  }
};

resultsSearch.addEventListener('input', renderResults);
resultsEventFilter.addEventListener('change', renderResults);
resultsClassFilter.addEventListener('change', renderResults);
loadResults();
