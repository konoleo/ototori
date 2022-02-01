function getClosestElem(num, arr) {
	num = Number(num);
	return arr.reduce((prev, curr) => {
		return (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev);
	});
}

const fileDiv = document.getElementById("fileDiv");
const fileLabel = document.getElementById("fileLabel");
const fileInputE = document.getElementById("inputMidi");
const controlers = document.getElementById("controlers");
const picoAudio = new PicoAudio();
const playPause = document.getElementById("playPause");
const skipPrevious = document.getElementById("skipPrevious");
const replay5 = document.getElementById("replay5");
const pianoRoll = document.getElementById("pianoroll");
var chorusNum = 0;
var scrollAnime;
var minPitch;

fileDiv.style.height = window.innerHeight + "px";

async function readMidi(e) {
	const file = e.target.files[0];
	const reader = new FileReader();
	reader.onload = () => {
		const smf = new Uint8Array(reader.result);
		const smfData = picoAudio.parseSMF(smf);
		// データセット
		picoAudio.setData(smfData);
		// ノート初期化
		pianoRoll.innerHTML = "";
		// ノート作成
		const mainChannel = smfData.channels[chorusNum];
		const mainPitches = mainChannel.notes.map(note => note.pitch);
		const min = Math.min(...mainPitches);
		const max = Math.max(...mainPitches);
		minPitch = (min - (300 / 7 - (max - min)) / 2) * 7;
		mainChannel.notes.forEach(note => {
			const newNote = document.createElement("div");
			newNote.classList.add("note");
			// const soundData = Object.values(freqList).find(value => value.midinote === note.pitch);
			newNote.style.left = note.start / 7 + "px";
			newNote.style.bottom = note.pitch * 7 - minPitch + "px";
			newNote.style.width = (note.stop - note.start) / 7 + "px";
			pianoRoll.appendChild(newNote);
		});
		// スクロール設定
		let keyframes = [{
			transform: "translateX(0)",
			offset: 0
		}];
		for (let i = 0; i < smfData.tempoTrack.length; i++) {
			const nextTempoData = smfData.tempoTrack[i + 1];
			if (smfData.songLength !== smfData.tempoTrack[i].timing) {
				keyframes.push({
					transform: `translateX(${nextTempoData.timing / 7 * -1}px)`,
					offset: picoAudio.getTime(nextTempoData.timing) / picoAudio.getTime(smfData.songLength)
				});
			}
		}
		scrollAnime = pianoRoll.animate(keyframes, {
			duration: picoAudio.getTime(smfData.songLength) * 1000,
			easing: "linear",
			fill: "forwards"
		});
		pianoRoll.style.width = `${smfData.songLength / 7}px`;
		scrollAnime.pause();
	};
	reader.readAsArrayBuffer(file);
}

// ファイル読み込み
fileInputE.addEventListener("change", (e) => {
	readMidi(e);
	// 表示・非表示
	fileDiv.setAttribute("hidden", "");
	document.getElementsByTagName("main")[0].removeAttribute("hidden");
	fileLabel.innerHTML = fileLabel.innerHTML.replace("ファイルを選択", "別の曲を練習する");
	controlers.appendChild(fileLabel);
	// 新しい場所にイベント追加
	document.querySelector("#controlers #inputMidi").addEventListener("change", e => readMidi(e));
}, {once: true});

// 再生/停止
playPause.addEventListener("click", () => {
	picoAudio.init();
	if (playPause.getAttribute("data-playing") === "false") {
		// 再生中
		playPause.textContent = "pause";
		playPause.setAttribute("title", "停止");
		playPause.setAttribute("data-playing", "true");
		picoAudio.play();
		scrollAnime.play();
	} else {
		// 停止中
		playPause.textContent = "play_arrow";
		playPause.setAttribute("title", "再生");
		playPause.setAttribute("data-playing", "false");
		picoAudio.pause();
		scrollAnime.pause();
	}
});

// 最初に戻す
skipPrevious.addEventListener("click", () => {
	picoAudio.init();
	picoAudio.initStatus();
	scrollAnime.cancel();
	document.querySelectorAll(".voice").forEach(elem => {
		elem.remove();
	});
	if (playPause.getAttribute("data-playing") === "true") {
		playPause.click();
	}
});

// 5秒戻す
replay5.addEventListener("click", () => {
	const test = scrollAnime.currentTime;
	let before5Time = test - 5000;
	if (before5Time < 0) {
		before5Time = 0
	}
	scrollAnime.currentTime = before5Time;
	scrollAnime.startTime = before5Time;
	// scrollAnime.pause();
	picoAudio.setStartTime(before5Time);
	console.log("scrollAnime.currentTime: ", test);
	console.log("scrollAnime.currentTime: ", scrollAnime.currentTime);
	document.querySelectorAll(".voice").forEach(elem => {
		if (Number(elem.style.left.replace("px", "")) * 7 > picoAudio.getTiming(before5Time)) {
			elem.remove();
		}
	});
	if (playPause.getAttribute("data-playing") === "true") {
		playPause.click();
	}
});

(async function () {
	const freqList = await fetch("freqList.json").then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.url}にアクセスできません。`)));
	const stream = await navigator.mediaDevices.getUserMedia({audio: true});
	const audioCtx = new AudioContext({sampleRate: 44100});
	const analyser = audioCtx.createAnalyser();
	analyser.fftSize = 16384;
	const input = audioCtx.createMediaStreamSource(stream);
	input.connect(analyser);
	const frequencyData = new Uint8Array(analyser.frequencyBinCount);
	const unit = audioCtx.sampleRate / analyser.fftSize;

	function voiceToNote() {
		analyser.getByteFrequencyData(frequencyData);
		const maxValue = Math.max(...frequencyData);
		const index = frequencyData.indexOf(maxValue);
		if (maxValue > 200 && index !== 0) {
			const hz = Math.round(index * unit);
			const closestHz = getClosestElem(hz, Object.keys(freqList));
			const soundData = freqList[closestHz];
			const newestNote = pianoRoll.querySelector(":scope > .note.voice:last-of-type");
			const playTiming = getCurrentTiming();
			if (!newestNote || Number(newestNote.getAttribute("data-midinote")) !== soundData.midinote) {
				// 新しい音
				const newNote = document.createElement("div");
				newNote.classList.add("note", "voice");
				newNote.style.left = playTiming / 7 + "px";
				newNote.style.bottom = soundData.midinote * 7 - minPitch + "px";
				newNote.style.width = 0;
				newNote.setAttribute("data-midinote", soundData.midinote);
				newNote.setAttribute("data-start", playTiming);
				pianoRoll.appendChild(newNote);
			} else {
				// 前の音の続き
				const startTiming = Number(newestNote.getAttribute("data-start"));
				newestNote.style.width = (playTiming - startTiming) / 7 + "px";
			}
		}
	}

	var timer;
	picoAudio.addEventListener("play", async () => {
		timer = setInterval(voiceToNote, 10);
	});
	picoAudio.addEventListener("pause", () => {
		clearTimeout(timer);
	});
}());

function getCurrentTiming() {
	return (picoAudio.context ? picoAudio.getTiming(picoAudio.context.currentTime) : 0) - picoAudio.getTiming(picoAudio.states.startTime);
}

// ピアノロール
// picoAudio.addEventListener("noteOn", (note) => {
// 	const newNote = document.createElement("div");
// 	newNote.classList.add("note");
// 	const soundData = Object.values(freqList).find(value => value.midinote === note.pitch);
// 	newNote.style.bottom = note.pitch * 5 + "px";
// 	newNote.style.left = note.start / 10 + "px";
// 	newNote.style.width = (note.stop - note.start) / 10 + "px";
// 	newNote.setAttribute("data-ja", soundData.japanese);
// 	pianoRoll.appendChild(newNote);
// });