// Global variables
let array = [];
let arraySize = 50;
let sortSpeed = 15; // Updated default speed
let isSorting = false;
let currentAlgorithm = null;
let shouldStop = false;

// DOM Elements
const arrayContainer = document.getElementById('array-container');
const arraySizeSlider = document.getElementById('array-size');
const sortSpeedSlider = document.getElementById('sort-speed');
const sizeValue = document.getElementById('size-value');
const speedValue = document.getElementById('speed-value');
const themeToggle = document.getElementById('theme-toggle');
const stopButton = document.getElementById('stop-button');
const timeBest = document.getElementById('time-best');
const timeAvg = document.getElementById('time-avg');
const timeWorst = document.getElementById('time-worst');
const spaceBest = document.getElementById('space-best');
const spaceAvg = document.getElementById('space-avg');
const spaceWorst = document.getElementById('space-worst');
const status = document.getElementById('status');

// DOM Elements for algorithm buttons
const algorithmButtons = document.querySelectorAll('.algorithm-btn');

// Algorithm complexities
const complexities = {
    bubbleSort: {
        time: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)' },
        space: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)' }
    },
    quickSort: {
        time: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)' },
        space: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(n)' }
    },
    mergeSort: {
        time: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)' },
        space: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)' }
    },
    heapSort: {
        time: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)' },
        space: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)' }
    },
    insertionSort: {
        time: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)' },
        space: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)' }
    }
};

// Theme switching
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Update slider values
arraySizeSlider.addEventListener('input', (e) => {
    arraySize = parseInt(e.target.value);
    sizeValue.textContent = arraySize;
    if (!isSorting) {
        generateNewArray();
    }
});

sortSpeedSlider.addEventListener('input', (e) => {
    sortSpeed = parseInt(e.target.value);
    speedValue.textContent = sortSpeed;
});

// Add click handlers for algorithm buttons
algorithmButtons.forEach(button => {
    button.addEventListener('click', () => {
        if (isSorting) return;
        const algorithm = button.dataset.algorithm;
        setActiveAlgorithm(algorithm);
        startSorting(algorithm);
    });
});

// Set active algorithm
function setActiveAlgorithm(algorithm) {
    algorithmButtons.forEach(btn => {
        if (btn.dataset.algorithm === algorithm) {
            btn.classList.add('active');
            // Update complexity immediately when algorithm is selected
            updateComplexity(algorithm);
        } else {
            btn.classList.remove('active');
        }
    });
}

// Clear active algorithm
function clearActiveAlgorithm() {
    algorithmButtons.forEach(btn => btn.classList.remove('active'));
}

// Stop sorting
function stopSorting() {
    if (!isSorting) return;

    shouldStop = true;
    stopButton.disabled = true;
    updateStatus('Sorting stopped');
    clearActiveAlgorithm();
    resetBars();
}

// Update complexity information
function updateComplexity(algorithm) {
    const complexity = complexities[algorithm];
    if (!complexity) return;

    timeBest.textContent = complexity.time.best;
    timeAvg.textContent = complexity.time.avg;
    timeWorst.textContent = complexity.time.worst;
    spaceBest.textContent = complexity.space.best;
    spaceAvg.textContent = complexity.space.avg;
    spaceWorst.textContent = complexity.space.worst;
}

// Reset complexity information
function resetComplexity() {
    timeBest.textContent = '-';
    timeAvg.textContent = '-';
    timeWorst.textContent = '-';
    spaceBest.textContent = '-';
    spaceAvg.textContent = '-';
    spaceWorst.textContent = '-';
}

// Generate new array
function generateNewArray() {
    if (isSorting) return;

    array = [];
    arrayContainer.innerHTML = '';

    for (let i = 0; i < arraySize; i++) {
        const value = Math.floor(Math.random() * 100) + 1;
        array.push(value);

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${value}%`;
        arrayContainer.appendChild(bar);
    }

    updateStatus('Ready');
    resetComplexity();
    stopButton.disabled = true;
    clearActiveAlgorithm();
}

// Update bar heights
function updateBars() {
    const bars = arrayContainer.getElementsByClassName('bar');
    for (let i = 0; i < array.length; i++) {
        bars[i].style.height = `${array[i]}%`;
    }
}

// Sleep function for visualization
async function sleep(ms) {
    if (shouldStop) {
        throw new Error('Sorting stopped');
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Update status
function updateStatus(message) {
    status.textContent = message;
}

// Highlight bars being compared
async function highlightBars(index1, index2) {
    const bars = arrayContainer.getElementsByClassName('bar');
    bars[index1].classList.add('comparing');
    bars[index2].classList.add('comparing');
    await sleep(1000 / sortSpeed);
    bars[index1].classList.remove('comparing');
    bars[index2].classList.remove('comparing');
}

// Mark bar as sorted
function markSorted(index) {
    const bars = arrayContainer.getElementsByClassName('bar');
    bars[index].classList.add('sorted');
}

// Reset all bars
function resetBars() {
    const bars = arrayContainer.getElementsByClassName('bar');
    for (let bar of bars) {
        bar.classList.remove('comparing', 'sorted');
        bar.style.backgroundColor = ''; // Reset to default color
    }
}

// Reset sorting
function resetSorting() {
    shouldStop = true;
    isSorting = false;
    currentAlgorithm = null;

    // Re-enable controls
    arraySizeSlider.disabled = false;
    sortSpeedSlider.disabled = false;
    document.querySelectorAll('.btn').forEach(btn => btn.disabled = false);

    // Reset status
    updateStatus('Sorting stopped');
    updateComplexity('-');

    // Generate new array
    generateNewArray();
}

// Start sorting
async function startSorting(algorithm) {
    if (isSorting) return;

    shouldStop = false;
    isSorting = true;
    currentAlgorithm = algorithm;
    resetBars();
    stopButton.disabled = false;

    // Disable controls
    arraySizeSlider.disabled = true;
    sortSpeedSlider.disabled = true;
    document.querySelectorAll('.btn').forEach(btn => {
        if (btn !== stopButton && !btn.classList.contains('algorithm-btn')) {
            btn.disabled = true;
        }
    });

    // Update complexity information and set active algorithm
    updateComplexity(algorithm);
    setActiveAlgorithm(algorithm);

    try {
        // Update status based on algorithm
        updateStatus(`${algorithm.replace(/([A-Z])/g, ' $1').trim()} in progress...`);

        switch (algorithm) {
            case 'bubbleSort':
                await bubbleSort();
                break;
            case 'quickSort':
                await quickSort();
                break;
            case 'mergeSort':
                await mergeSort();
                break;
            case 'heapSort':
                await heapSort();
                break;
            case 'insertionSort':
                await insertionSort();
                break;
        }

        if (!shouldStop) {
            // Mark all bars as sorted only if sorting wasn't stopped
            const bars = arrayContainer.getElementsByClassName('bar');
            for (let bar of bars) {
                bar.classList.add('sorted');
            }
            updateStatus('Sorting completed!');
        }
    } catch (error) {
        if (shouldStop) {
            updateStatus('Sorting stopped');
            resetBars();
        } else {
            updateStatus('An error occurred');
            console.error(error);
        }
    } finally {
        // Re-enable controls
        arraySizeSlider.disabled = false;
        sortSpeedSlider.disabled = false;
        document.querySelectorAll('.btn').forEach(btn => {
            if (!btn.classList.contains('algorithm-btn')) {
                btn.disabled = false;
            }
        });
        stopButton.disabled = true;

        if (shouldStop) {
            clearActiveAlgorithm();
        }

        isSorting = false;
        currentAlgorithm = null;
    }
}

// Initialize
generateNewArray();