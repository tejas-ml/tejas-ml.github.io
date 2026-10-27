// Bubble Sort
async function bubbleSort() {
    const n = array.length;

    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            await highlightBars(j, j + 1);

            if (array[j] > array[j + 1]) {
                // Swap elements
                [array[j], array[j + 1]] = [array[j + 1], array[j]];
                updateBars();
            }
        }
        markSorted(n - i - 1);
    }
    markSorted(0);
}

// Quick Sort
async function quickSort() {
    await quickSortHelper(0, array.length - 1);
}

async function quickSortHelper(low, high) {
    if (low < high) {
        const pivotIndex = await partition(low, high);
        await quickSortHelper(low, pivotIndex - 1);
        await quickSortHelper(pivotIndex + 1, high);
    }
    if (low === high) {
        markSorted(low);
    }
}

async function partition(low, high) {
    const pivot = array[high];
    let i = low - 1;

    for (let j = low; j < high; j++) {
        await highlightBars(j, high);

        if (array[j] <= pivot) {
            i++;
            [array[i], array[j]] = [array[j], array[i]];
            updateBars();
        }
    }

    [array[i + 1], array[high]] = [array[high], array[i + 1]];
    updateBars();
    return i + 1;
}

// Merge Sort
async function mergeSort() {
    await mergeSortHelper(0, array.length - 1);
}

async function mergeSortHelper(left, right) {
    if (left < right) {
        const mid = Math.floor((left + right) / 2);
        await mergeSortHelper(left, mid);
        await mergeSortHelper(mid + 1, right);
        await merge(left, mid, right);
    }
    if (left === right) {
        markSorted(left);
    }
}

async function merge(left, mid, right) {
    const leftArray = array.slice(left, mid + 1);
    const rightArray = array.slice(mid + 1, right + 1);
    let i = 0,
        j = 0,
        k = left;

    while (i < leftArray.length && j < rightArray.length) {
        await highlightBars(k, k);

        if (leftArray[i] <= rightArray[j]) {
            array[k] = leftArray[i];
            i++;
        } else {
            array[k] = rightArray[j];
            j++;
        }
        updateBars();
        k++;
    }

    while (i < leftArray.length) {
        array[k] = leftArray[i];
        updateBars();
        i++;
        k++;
    }

    while (j < rightArray.length) {
        array[k] = rightArray[j];
        updateBars();
        j++;
        k++;
    }
}

// Heap Sort
async function heapSort() {
    const n = array.length;

    // Build max heap
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        await heapify(n, i);
    }

    // Extract elements from heap one by one
    for (let i = n - 1; i > 0; i--) {
        await highlightBars(0, i);
        [array[0], array[i]] = [array[i], array[0]];
        updateBars();
        markSorted(i);
        await heapify(i, 0);
    }
    markSorted(0);
}

async function heapify(n, i) {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < n) {
        await highlightBars(largest, left);
        if (array[left] > array[largest]) {
            largest = left;
        }
    }

    if (right < n) {
        await highlightBars(largest, right);
        if (array[right] > array[largest]) {
            largest = right;
        }
    }

    if (largest !== i) {
        [array[i], array[largest]] = [array[largest], array[i]];
        updateBars();
        await heapify(n, largest);
    }
}

// Insertion Sort
async function insertionSort() {
    const n = array.length;

    for (let i = 1; i < n; i++) {
        const key = array[i];
        let j = i - 1;

        while (j >= 0) {
            await highlightBars(j, j + 1);

            if (array[j] > key) {
                array[j + 1] = array[j];
                updateBars();
                j--;
            } else {
                break;
            }
        }

        array[j + 1] = key;
        updateBars();
        markSorted(i);
    }
    markSorted(0);
}

// Event listeners for sorting buttons
document.querySelectorAll('.algorithm-buttons .btn').forEach(button => {
    button.addEventListener('click', () => {
        const algorithm = button.textContent.toLowerCase().replace(/\s+/g, '');
        startSorting(algorithm);
    });
});