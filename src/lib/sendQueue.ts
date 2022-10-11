import router from "next/router";

/*
interface File {
  name: string;
  type: string;
  blob: Blob;
}
*/

interface Share {
  title: string;
  text: string;
  files: File[];
}

class SendQueue {
  _queue: Share[] = [];

  add(share: Share) {
    this._queue.push(share);
    console.log("add", share);
    return this;
  }

  get() {
    // return this._queue[0];
    return this._queue.pop();
  }

  to(path: string) {
    router.push(path);
  }

  has() {
    return this._queue.length > 0;
  }
}

const sendQueue = new SendQueue();

// if (typeof window === "object") window.sendQueue = sendQueue;

const outputImageQueue = new SendQueue();
const maskImageQueue = new SendQueue();

export { outputImageQueue, maskImageQueue };
export default sendQueue;
