const eventsTypeFilter = document.getElementById('events-type-filter');
const eventsStatusFilter = document.getElementById('events-status-filter');
const eventsSummary = document.getElementById('events-summary');
const eventsTable = document.getElementById('events-table');
const currentScriptSrc = document.currentScript ? document.currentScript.src : '';
const embeddedEventsData = document.getElementById('events-data');
let eventsData = [];
let sortColumn = 'date';
let sortAscending = true;

const formatCell = (value) => value === null || value === undefined || value === '' ? '-' : value;

const formatDate = (dateString) => {
  const date = new Date(dateString + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const getEventStatus = (event) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(`${event.date}T00:00:00`);
  return eventDate < today ? 'past' : 'upcoming';
};

const hasViableLink = (link) => Boolean(link && link.trim() && link.trim() !== '#');
const hasRecordedResults = (event) => event.type !== 'Games Show';

const createActionLink = (event, status) => {
  if (status === 'upcoming') {
    if (hasViableLink(event.entryLink)) {
      return `<a href="${event.entryLink}" class="event-action-link">Enter</a>`;
    }
    return '<span class="no-results">Entry pending</span>';
  }

  if (hasViableLink(event.resultsLink)) {
    return `<a href="${event.resultsLink}" class="event-action-link">View Results</a>`;
  }

  if (!hasRecordedResults(event)) {
    return '<span class="no-results">Not recorded</span>';
  }

  return '<a href="../results.html" class="event-action-link">See Results</a>';
};

const createTable = (data) => {
  if (!data.length) {
    return '<p>No events match the current filters.</p>';
  }

  const rows = data.map((event) => {
    const status = getEventStatus(event);

    return `
    <tr class="event-row event-${status}">
      <td class="date-cell">${formatDate(event.date)}</td>
      <td>${formatCell(event.event)}</td>
      <td>${formatCell(event.location)}</td>
      <td><span class="event-type-badge">${formatCell(event.type)}</span></td>
      <td class="status-cell"><span class="status-badge status-${status}">${status === 'past' ? 'Past' : 'Upcoming'}</span></td>
      <td class="actions-cell">${createActionLink(event, status)}</td>
    </tr>
  `;
  }).join('');

  return `
    <table class="events-table">
      <thead>
        <tr>
          <th class="sortable" data-column="date">Date <span class="sort-indicator"></span></th>
          <th class="sortable" data-column="event">Event <span class="sort-indicator"></span></th>
          <th class="sortable" data-column="location">Location <span class="sort-indicator"></span></th>
          <th class="sortable" data-column="type">Type <span class="sort-indicator"></span></th>
          <th class="sortable" data-column="status">Status <span class="sort-indicator"></span></th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const updateSummary = (count, total) => {
  const statusFilter = eventsStatusFilter.value || 'all';
  const typeFilter = eventsTypeFilter.value || 'all';
  eventsSummary.textContent = `Showing ${count} event${count === 1 ? '' : 's'}${total > count ? ` (${total} total)` : ''}`;
};

const filterEvents = () => {
  const typeFilter = eventsTypeFilter.value;
  const statusFilter = eventsStatusFilter.value;

  return eventsData.filter((event) => {
    const matchType = !typeFilter || event.type === typeFilter;
    const matchStatus = !statusFilter || getEventStatus(event) === statusFilter;
    return matchType && matchStatus;
  });
};

const sortEvents = (data) => {
  const dataCopy = [...data];
  
  dataCopy.sort((a, b) => {
    let aVal = a[sortColumn];
    let bVal = b[sortColumn];

    // Handle date sorting specially
    if (sortColumn === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (sortColumn === 'status') {
      aVal = getEventStatus(a);
      bVal = getEventStatus(b);
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortAscending ? -1 : 1;
    if (aVal > bVal) return sortAscending ? 1 : -1;
    return 0;
  });

  return dataCopy;
};

const populateFilterOptions = (data) => {
  eventsTypeFilter.innerHTML = '<option value="">All types</option>';
  const types = Array.from(new Set(data.map((e) => e.type))).sort();
  types.forEach((type) => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    eventsTypeFilter.appendChild(option);
  });
};

const renderEvents = () => {
  const filtered = filterEvents();
  const sorted = sortEvents(filtered);
  eventsTable.innerHTML = createTable(sorted);
  updateSummary(sorted.length, eventsData.length);
  
  // Add click handlers for sorting
  document.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', (e) => {
      const column = th.dataset.column;
      if (sortColumn === column) {
        sortAscending = !sortAscending;
      } else {
        sortColumn = column;
        sortAscending = true;
      }
      renderEvents();
    });
  });
};

const loadEvents = async () => {
  if (embeddedEventsData && embeddedEventsData.textContent.trim()) {
    try {
      eventsData = JSON.parse(embeddedEventsData.textContent);
      populateFilterOptions(eventsData);
      renderEvents();
      return;
    } catch (error) {
      console.warn('Invalid embedded events data. Falling back to fetch.', error);
    }
  }

  const candidates = new Set();

  if (currentScriptSrc) {
    candidates.add(new URL('../data/events.json', currentScriptSrc).href);
  }

  candidates.add(new URL('data/events.json', window.location.href).href);
  candidates.add(new URL('./data/events.json', window.location.href).href);
  candidates.add(new URL('../data/events.json', window.location.href).href);
  if (window.location.origin && window.location.origin !== 'null') {
    candidates.add(new URL('/data/events.json', window.location.origin).href);
  }

  let lastError;

  for (const dataUrl of candidates) {
    console.info('Attempting to load event data from', dataUrl);
    try {
      const response = await fetch(dataUrl);
      if (response.ok) {
        try {
          eventsData = await response.json();
        } catch (error) {
          lastError = new Error(`Invalid JSON in ${dataUrl}`);
          console.warn(lastError, error);
          continue;
        }
        console.info(`Loaded ${eventsData.length} events from`, dataUrl);
        populateFilterOptions(eventsData);
        renderEvents();
        return;
      }
      lastError = new Error(`Fetch failed with status ${response.status} for ${dataUrl}`);
      console.warn(lastError);
    } catch (error) {
      lastError = error;
      console.warn(`Error fetching ${dataUrl}:`, error);
    }
  }

  eventsSummary.textContent = 'Unable to load events. Please try again later.';
  eventsTable.innerHTML = '';
  console.error('Failed to load events data from any candidate path.', lastError);
};

eventsTypeFilter.addEventListener('change', renderEvents);
eventsStatusFilter.addEventListener('change', renderEvents);
loadEvents();
