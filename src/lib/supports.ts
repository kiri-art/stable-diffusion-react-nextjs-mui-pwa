const supports = {
  _jxl: null as boolean | null,
  jxl() {
    if (this._jxl === null) {
      return new Promise((resolve) => {
        const jxlTest = new Image();
        jxlTest.src =
          "data:image/jxl;base64,/woIELASCAgQAFwASxLFgkWAHL0xqnCBCV0qDp901Te/5QM=";
        jxlTest.onload = () => {
          this._jxl = true;
          resolve(true);
        };
        jxlTest.onerror = () => {
          this._jxl = false;
          resolve(false);
        };
      });
    } else {
      return Promise.resolve(this._jxl);
    }
  },
};

export default supports;
