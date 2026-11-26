(function () {
  const SCHOLAR_URL =
    'https://scholar.google.com/citations?user=-2meKdkAAAAJ&hl=en';

  function normalizePublications(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.publications)) return data.publications;
    return [];
  }

  function getYear(pub) {
    if (pub.year) return Number(pub.year);
    if (Array.isArray(pub.date) && pub.date.length) return pub.date[0];
    return null;
  }

  function formatAuthors(pub) {
    if (Array.isArray(pub.authors)) return pub.authors.join(', ');
    if (typeof pub.authors === 'string') return pub.authors;
    return '';
  }

  function formatStatus(pub) {
    return pub.status || pub.journal || pub.venue || pub.publisher || '';
  }

  function isChronoGRN(pub) {
    return /chronogrn/i.test(pub.title || '');
  }

  function renderPublication(pub) {
    const year = getYear(pub);
    const title = pub.title || 'Untitled';
    const authors = formatAuthors(pub);
    const status = formatStatus(pub);
    const link = pub.link || '';
    const code = pub.code || '';
    const citations =
      typeof pub.citations === 'number' && pub.citations > 0
        ? `${pub.citations} citation${pub.citations === 1 ? '' : 's'}`
        : '';

    const entry = document.createElement('article');
    entry.className = 'pub-entry';

    const titleEl = document.createElement('div');
    titleEl.className = 'pub-title';
    if (link) {
      const a = document.createElement('a');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = title;
      titleEl.appendChild(a);
    } else {
      titleEl.textContent = title;
    }

    entry.appendChild(titleEl);

    if (authors) {
      const authorsEl = document.createElement('div');
      authorsEl.className = 'pub-authors';
      authorsEl.textContent = authors;
      entry.appendChild(authorsEl);
    }

    const metaParts = [];
    if (status) metaParts.push(status);
    if (year) metaParts.push(String(year));
    if (citations) metaParts.push(citations);

    if (metaParts.length || code) {
      const venueEl = document.createElement('div');
      venueEl.className = 'pub-venue';
      if (metaParts.length) {
        venueEl.appendChild(document.createTextNode(metaParts.join(' · ')));
      }
      if (code) {
        if (metaParts.length) {
          venueEl.appendChild(document.createTextNode(' · '));
        }
        const a = document.createElement('a');
        a.href = code;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = 'Code';
        venueEl.appendChild(a);
      }
      entry.appendChild(venueEl);
    }

    return entry;
  }

  function renderFallback(container) {
    container.innerHTML = `
      <div class="placeholder">
        Could not load this list. See
        <a href="${SCHOLAR_URL}" target="_blank" rel="noopener">Google Scholar</a>
        for current records.
      </div>
    `;
  }

  async function loadPublications() {
    const container = document.getElementById('publications-list');
    const syncNote = document.getElementById('publications-sync');
    if (!container) return;

    try {
      const response = await fetch('data/publications.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const publications = normalizePublications(data).filter(
        (pub) => pub.title && !isChronoGRN(pub)
      );

      if (!publications.length) {
        container.innerHTML = `
          <div class="placeholder">
            No manuscripts or research software listed yet. See
            <a href="${SCHOLAR_URL}" target="_blank" rel="noopener">Google Scholar</a>.
          </div>
        `;
        return;
      }

      publications.sort((a, b) => (getYear(b) || 0) - (getYear(a) || 0));

      container.innerHTML = '';
      publications.forEach((pub) => {
        container.appendChild(renderPublication(pub));
      });

      if (syncNote) {
        syncNote.hidden = false;
      }
    } catch (error) {
      console.error('Failed to load publications:', error);
      renderFallback(container);
    }
  }

  document.addEventListener('DOMContentLoaded', loadPublications);
})();
