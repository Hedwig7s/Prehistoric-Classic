export class ArrayBufferSink {
    buffer: Buffer;
    bytesWritten = 0;
    limit: number;
    capacity: number;
    constructor(limit = 536870912, capacity = 1024) { // 512 MiB, 1KiB
        this.limit = limit;
        this.capacity = capacity;
        this.buffer = Buffer.alloc(this.capacity);
    }
    write(chunk: ArrayBufferLike) {
        const spaceNeeded = this.bytesWritten + chunk.byteLength;
        if (spaceNeeded > this.limit) {
            throw Error("Buffer size required exceeds limit!");
        }
        if (spaceNeeded > this.buffer.byteLength) {
            let newLength = 0;
            while (newLength < spaceNeeded) newLength = Math.min(this.buffer.byteLength * 2, this.limit);
            const newBuffer = Buffer.alloc(newLength);
            this.buffer.copy(newBuffer);
            this.buffer = newBuffer;
        }
        this.bytesWritten += Buffer.from(chunk).copy(this.buffer);
    };
    flush(): Uint8Array {
        const flushed = Uint8Array.from(this.buffer.subarray(0, this.bytesWritten));
        this.buffer = Buffer.alloc(this.capacity);
        this.bytesWritten = 0;

        return flushed;
    };
}

export default ArrayBufferSink;
