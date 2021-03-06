import KissFFT from "./KissFFT";
import { setSnackbarMessage } from "../../fredux/actions/message";

export default class Audio {
    constructor(infile, gui, onprogress) {
        this.infile = infile;
        this.audioCtx = new AudioContext();
        this.playing = false;
        this.playBufferSource = this.audioCtx.createBufferSource();
        this.loaded = false;
        this.fftSize = 2048 * 8;

        this.useTwoChannelFFT = false;
        this.volume = 1;
        this.storedVolume = 1;
        this.muted = false;
        this.exportWindowSize = 1152;
        this.exportFrameIdx = 0;
        this.gui = gui;
        this.onProgress = onprogress;
        this.loadFft();
    }

    load = () => {
        return new Promise((resolve, reject) => {
            this.onfileready = resolve;
            if (typeof this.infile === "string") {
                this.loadFileFromUrl(this.infile);
            } else {
                this.loadFileFromFile(this.infile);
            }
        });
    };

    loadFft = () => {
        this.Module = {};
        try {
            KissFFT(this.Module);
        } catch (err) {
            setSnackbarMessage(
                "Failed to initialize FFT module, please reload",
                "error",
                10000000
            );
        }

        this.Module["onRuntimeInitialized"] = () => {
            this.Module._init_r(this.fftSize);
            this.moduleLoaded = true;
        };
    };

    setFFTSize = (fftSize) => {
        this.fftSize = Number(fftSize);
        if (this.moduleLoaded) {
            this.Module._init_r(this.fftSize);
            if (this.gui) this.gui.updateDisplay();
        }
    };

    setEncodeStartTime = (time) => {
        this.exportFrameIdx = Math.floor(
            (time * this.sampleRate) / this.exportWindowSize
        );
    };

    getEncodingFrame = () => {
        const sidx = this.exportFrameIdx * this.exportWindowSize;
        const eidx = (this.exportFrameIdx + 1) * this.exportWindowSize;

        const leftBuffer = new Float32Array(this.exportWindowSize);
        const rightBuffer = new Float32Array(this.exportWindowSize);

        leftBuffer.set(
            this.bufferSource.buffer.getChannelData(0).slice(sidx, eidx),
            0
        );

        rightBuffer.set(
            this.bufferSource.buffer.getChannelData(1).slice(sidx, eidx),
            0
        );
        this.exportFrameIdx++;
        return {
            type: "audio",
            left: leftBuffer,
            right: rightBuffer,
            sampleRate: this.sampleRate
        };
    };

    // VOLUME FROM [0..1]
    setVolume = (volume) => {
        if (this.gainNode)
            this.gainNode.gain.setValueAtTime(
                volume,
                this.audioCtx.currentTime
            );
        this.volume = volume;
    };

    play = (time = 0, offset = 0) => {
        if (this.playing) {
            this.playBufferSource.stop();
        }
        this.playBufferSource = this.audioCtx.createBufferSource();
        this.playBufferSource.buffer = this.bufferSource.buffer;
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = this.volume;
        this.playBufferSource.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
        this.playBufferSource.start(offset, time);
        this.playing = true;
    };

    getAudioByteData = (buffer) => {};

    toggleMuted = () => {
        this.muted = !this.muted;
        if (this.muted) {
            this.storedVolume = this.volume;
            this.setVolume(0);
        } else {
            this.setVolume(this.storedVolume);
        }
    };

    setUnmuted = () => {
        this.setVolume(this.storedVolume);
        this.muted = false;
    };

    getCombinedAudioData = (canvasWidth) => {
        const nrPointsToDraw = canvasWidth;
        const buffer = this.bufferSource.buffer;

        const stepSize = Math.floor(buffer.length / nrPointsToDraw);
        let data = new Float32Array(nrPointsToDraw);

        const left = buffer.getChannelData(0);
        let cnt = 0;
        if (buffer.numberOfChannels === 1) {
            for (let i = 0; i < buffer.length; i += stepSize) {
                data[cnt++] = left[i];
            }
        } else {
            const right = buffer.getChannelData(1);
            for (let i = 0; i < buffer.length; i += stepSize) {
                data[cnt++] = (left[i] + right[i]) / 2;
            }
        }

        return data;
    };

    getAudioData = (time) => {
        const halfWindowSize = this.fftSize / 2;
        let idx = Math.floor(time * this.bufferSource.buffer.sampleRate);
        if (idx < 0) idx = 0;
        let audio_p, bins, buf_p;

        const buffer = this.bufferSource.buffer;
        const leftAudio = buffer.getChannelData(0);

        let data = new Float32Array(this.fftSize);
        if (buffer.numberOfChannels === 1 || !this.useTwoChannelFFT) {
            data = leftAudio.subarray(idx, idx + this.fftSize);
        } else {
            const rightAudio = buffer.getChannelData(1);
            for (var i = 0; i < this.fftSize; i++) {
                data[i] = (leftAudio[idx + i] + rightAudio[idx + i]) / 2;
            }
        }

        try {
            audio_p = this.Module._malloc(this.fftSize * 4);
            this.Module.HEAPF32.set(data, audio_p >> 2);

            buf_p = this.Module._fft_r(audio_p, this.fftSize, 2);
            bins = new Float32Array(
                this.Module.HEAPU8.buffer,
                buf_p,
                halfWindowSize
            );
        } finally {
            this.Module._free(audio_p);
            this.Module._free(buf_p);
        }

        return { frequencyData: bins, timeData: data };
    };
    stop = () => {
        if (this.playing) {
            this.playBufferSource.stop();
        }
        this.playing = false;
    };

    onload = (ev) => {
        this.audioCtx.decodeAudioData(ev.target.result).then((buffer) => {
            this.bufferSource = this.audioCtx.createBufferSource();
            if (buffer.numberOfChannels === 1 || buffer.numberOfChannels > 2) {
                setSnackbarMessage(
                    "Only stereo audio is currently supported, please load a new audio file.",
                    "error",
                    1000000
                );
            }
            this.bufferSource.buffer = buffer;
            this.duration = buffer.duration;
            this.sampleRate = buffer.sampleRate;
            this.onProgress(0.99);
            this.getAudioByteData(buffer);
            this.onfileready(buffer.duration);
        });
    };

    loadFileFromUrl(url) {
        var oReq = new XMLHttpRequest();
        oReq.open("GET", url);
        oReq.responseType = "arraybuffer";
        oReq.onload = () => {
            var blob = oReq.response; // Note: not oReq.responseText
            if (blob) {
                this.onload({ target: { result: blob } });
            }
        };

        oReq.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
                const percentComplete = event.loaded / event.total;
                this.onProgress(Math.max(percentComplete - 0.02, 0));
            }
        });

        oReq.send();

        /*
        fetch(url)
            .then(response => {
                return response.blob();
            })
            .then(blob => {
                let fileReader = new FileReader();
                fileReader.readAsArrayBuffer(blob);
                fileReader.onload = this.onload;
            })
            .catch(err => {
                console.log(err);
            });
            */
    }

    loadFileFromFile(file) {
        let fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = this.onload;
        fileReader.onerror = (err) => console.log(err);
        fileReader.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = event.loaded / event.total;
                this.onProgress(Math.max(percentComplete - 0.02, 0));
            }
        };
    }
}
