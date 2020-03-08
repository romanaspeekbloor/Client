const rtlsdr = require('rtl-sdr')

module.exports = function SDR(freqMhz, sampleRate, deviceIndex) {
  // const ppmCorrection = 0
  // const freq = 90 * 1000000
  // const sampleRate = 1000000
  this.freqHhz = freqMhz;
  this.ppm = 0;
  this.deviceIndex = deviceIndex;
  this.sampleRate = sampleRate;
  this.dev;

  this.init = function() {
    const deviceCount = rtlsdr.get_device_count()
    if (!deviceCount) {
      console.log('No supported RTLSDR devices found.')
      process.exit(1)
      return 'no devices';
    }
    this.dev = rtlsdr.open(deviceIndex);
    rtlsdr.set_tuner_gain_mode(this.dev, 1)
    rtlsdr.set_freq_correction(this.dev, this.ppm)
    rtlsdr.set_center_freq(this.dev, this.freqMhz)
    rtlsdr.set_sample_rate(this.dev, this.sampleRate)

    const gains = new Int32Array(100)
    const numgains = rtlsdr.get_tuner_gains(this.dev, gains)
    const gain = gains[numgains - 1]

    rtlsdr.set_tuner_gain(this.dev, gain)
    rtlsdr.reset_buffer(this.dev)

    return 'device set';
  };
  this.getHWInfo = function() {
    const vendor = Buffer.alloc(256)
    const product = Buffer.alloc(256)
    const serial = Buffer.alloc(256)

    return hwInfo = rtlsdr.get_device_usb_strings(0, vendor, product, serial)
  };
  this.doSample = function() {
    const bufNum = 10
    const bufLen = 512

    rtlsdr.read_async(this.dev, this.onData, this.onEnd, bufNum, bufLen)
  };
  this.onData = function(data, size) {
    const iqData = processIQ(data)
    const powers = iqData.map(complexDB)

    console.log(new Date(), powers)
  };
}

function complex(i, q) {
	return {i, q}
}

function complexLength(o) {
  return Math.sqrt(o.i ** 2 + o.q ** 2)
}

function complexDB(o) {
  return 10 * Math.log10(10 * (o.i ** 2 + o.q ** 2))
}

function processIQ (data) {
	console.assert(data.length % 2 === 0);
	const r = []
	for (var p = 0; p < data.length; p += 2) {
		const i = data.readInt8(p)
		const q = data.readInt8(p + 1)
		r.push(complex(i/(255/2) - 1, q/(255/2) - 1))
	}
	return r
}

function onEnd () {
  console.log('onEnd')
}
