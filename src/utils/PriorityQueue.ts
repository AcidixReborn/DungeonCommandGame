/**
 * PriorityQueue - Binary Heap implementation for O(log n) insert and extract
 *
 * Used by pathfinding algorithms (Dijkstra, A*) to efficiently track
 * the next lowest-cost node to explore.
 *
 * Big O Complexity:
 * - insert: O(log n) - bubble up through heap
 * - extractMin: O(log n) - bubble down through heap
 * - peek: O(1) - just return root
 * - isEmpty: O(1) - check length
 *
 * This replaces array.sort() which is O(n log n) per operation.
 * For pathfinding with ~150 nodes, this reduces from ~1000 comparisons
 * per extraction to ~7 comparisons per extraction.
 */
export class PriorityQueue<T> {
  private heap: T[] = []
  private compare: (a: T, b: T) => number

  /**
   * @param compareFn - Comparison function (a, b) => number
   *                    Returns negative if a < b, positive if a > b, 0 if equal
   *                    Default: (a, b) => a - b (min-heap for numbers)
   */
  constructor(
    compareFn: (a: T, b: T) => number = (a, b) =>
      (a as unknown as number) - (b as unknown as number)
  ) {
    this.compare = compareFn
  }

  private _parent(i: number): number {
    return Math.floor((i - 1) / 2)
  }

  private _leftChild(i: number): number {
    return 2 * i + 1
  }

  private _rightChild(i: number): number {
    return 2 * i + 2
  }

  private _swap(i: number, j: number): void {
    const temp = this.heap[i]
    this.heap[i] = this.heap[j]
    this.heap[j] = temp
  }

  /**
   * Bubble up element at index to restore heap property
   * O(log n) - at most height of tree comparisons
   */
  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = this._parent(i)
      if (this.compare(this.heap[i], this.heap[parent]) < 0) {
        this._swap(i, parent)
        i = parent
      } else {
        break
      }
    }
  }

  /**
   * Bubble down element at index to restore heap property
   * O(log n) - at most height of tree comparisons
   */
  private _bubbleDown(i: number): void {
    const n = this.heap.length
    while (true) {
      const left = this._leftChild(i)
      const right = this._rightChild(i)
      let smallest = i

      if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) {
        smallest = left
      }
      if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) {
        smallest = right
      }

      if (smallest !== i) {
        this._swap(i, smallest)
        i = smallest
      } else {
        break
      }
    }
  }

  /**
   * Insert an element into the priority queue
   * O(log n)
   */
  insert(element: T): void {
    this.heap.push(element)
    this._bubbleUp(this.heap.length - 1)
  }

  /**
   * Remove and return the minimum element
   * O(log n)
   */
  extractMin(): T | undefined {
    if (this.heap.length === 0) return undefined
    if (this.heap.length === 1) return this.heap.pop()

    const min = this.heap[0]
    this.heap[0] = this.heap.pop() as T
    this._bubbleDown(0)
    return min
  }

  /**
   * Peek at the minimum element without removing it
   * O(1)
   */
  peek(): T | undefined {
    return this.heap[0]
  }

  /**
   * Check if the queue is empty
   * O(1)
   */
  isEmpty(): boolean {
    return this.heap.length === 0
  }

  /**
   * Get the number of elements in the queue
   * O(1)
   */
  size(): number {
    return this.heap.length
  }

  /**
   * Clear all elements from the queue
   * O(1)
   */
  clear(): void {
    this.heap = []
  }
}

export default PriorityQueue
