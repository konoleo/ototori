function getClosestElem(num, arr) {
	num = Number(num);
	return arr.reduce((prev, curr) => {
		return (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev);
	});
}

const picoAudio = new PicoAudio();
const fileDiv = document.getElementById("fileDiv");
const fileLabel = document.getElementById("fileLabel");
const fileInputE = document.getElementById("inputMidi");
const main = document.getElementsByTagName("main")[0];
const timeBar = document.getElementById("timeBar");
const coloredLine = document.getElementById("coloredLine");
const currentTime = document.getElementById("current");
const lengthTime = document.getElementById("length");
const skipPrevious = document.getElementById("skipPrevious");
const replay5 = document.getElementById("replay5");
const playPause = document.getElementById("playPause");
const forward5 = document.getElementById("forward5");
const pianoRoll = document.getElementById("pianoroll");
var chorusNum = 0;
// シオン = 1;
var scrollAnime;
var songLengthTimig;
var minPitch;

fileDiv.style.height = window.innerHeight + "px";
main.style.height = window.innerHeight + "px";

// ファイル読み込み
fileInputE.addEventListener("change", async (e) => {
	const file = e.target.files[0];
	const reader = new FileReader();
	reader.onload = () => {
		const smf = new Uint8Array(reader.result);
		const smfData = picoAudio.parseSMF(smf);
		// データセット
		picoAudio.setData(smfData);
		songLengthTimig = smfData.songLength;
		timeBar.setAttribute("max", Math.round(picoAudio.getTime(songLengthTimig)));
		lengthTime.textContent = secToMin(Math.round(picoAudio.getTime(songLengthTimig)));
		// ノート作成
		pianoRoll.innerHTML = "";
		const mainChannel = smfData.channels[chorusNum];
		const mainPitches = mainChannel.notes.map(note => note.pitch);
		const min = Math.min(...mainPitches);
		const max = Math.max(...mainPitches);
		minPitch = (min - (pianoRoll.offsetHeight / 7 - (max - min)) / 2) * 7;
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
			if (songLengthTimig !== smfData.tempoTrack[i].timing) {
				keyframes.push({
					transform: `translateX(${nextTempoData.timing / 7 * -1}px)`,
					offset: picoAudio.getTime(nextTempoData.timing) / picoAudio.getTime(songLengthTimig)
				});
			}
		}
		scrollAnime = pianoRoll.animate(keyframes, {
			duration: picoAudio.getTime(songLengthTimig) * 1000,
			easing: "linear",
			fill: "forwards"
		});
		pianoRoll.style.width = `${songLengthTimig / 7}px`;
		scrollAnime.pause();
	};
	reader.readAsArrayBuffer(file);
	// 表示・非表示
	fileDiv.setAttribute("hidden", "");
	main.removeAttribute("hidden");
}, {once: true});

// タイムバー
timeBar.addEventListener("input", () => {
	skip(Number(timeBar.value), "absolute");
});

function changeTimeBar(num) {
	timeBar.value = (num === 0 || num) ? num : Math.round(getCurrentTime());
	coloredLine.style.width = `calc((100% - 16px) / ${timeBar.getAttribute("max")} * ${Number(timeBar.value)} + 8px)`;
	currentTime.textContent = secToMin(Number(timeBar.value));
}
function secToMin(sec) {
	return Math.floor(sec / 60) + ":" + (sec % 60).toString().padStart(2, "0");
}

// 再生/停止
var timeBarTimer;
playPause.addEventListener("click", () => {
	picoAudio.init();
	if (playPause.getAttribute("data-playing") === "false") {
		// 再生する
		playPause.textContent = "pause";
		playPause.setAttribute("title", "停止");
		playPause.setAttribute("data-playing", "true");
		picoAudio.play();
		scrollAnime.play();
		timeBarTimer = setInterval(changeTimeBar, 250);
	} else {
		// 停止する
		playPause.textContent = "play_arrow";
		playPause.setAttribute("title", "再生");
		playPause.setAttribute("data-playing", "false");
		picoAudio.pause();
		scrollAnime.pause();
		clearInterval(timeBarTimer);
	}
});

// 最初に戻す
skipPrevious.addEventListener("click", () => {
	picoAudio.initStatus();
	scrollAnime.cancel();
	changeTimeBar(0);
	document.querySelectorAll(".voice").forEach(elem => {
		elem.remove();
	});
	if (playPause.getAttribute("data-playing") === "true") {
		// 再生中
		playPause.click();
	}
});

// 5秒戻す
replay5.addEventListener("click", () => {
	skip(-5);
});

// 5秒進める
forward5.addEventListener("click", () => {
	skip(5);
});

function skip(second, type) {
	const songLengthTime = picoAudio.getTime(songLengthTimig);
	const currentTime = scrollAnime.currentTime / 1000;
	if (playPause.getAttribute("data-playing") === "false") {
		playPause.click();
	}
	if (type === "absolute") {
		var newTimeAbsolute = second;
		second = second - currentTime;
	}
	if (currentTime >= songLengthTime && Math.sign(second) === 1) {
		// if (playPause.getAttribute("data-playing") === "true") {
		// 	playPause.click();
		// }
		return;
	}
	if (Math.sign(second) === 1) {
		// 進める
		var newTime = songLengthTime < currentTime + second ? songLengthTime : currentTime + second;
		var delaySecond = songLengthTime < currentTime + second ? currentTime + second - songLengthTime : second;
	} else {
		// 戻す
		var newTime = currentTime + second > 0 ? currentTime + second : 0;
		var delaySecond = currentTime > second * -1 ? second : currentTime * -1;
	}
	picoAudio.setStartTime(delaySecond);
	scrollAnime.currentTime = (newTimeAbsolute || newTime) * 1000;
	changeTimeBar(newTimeAbsolute || newTime);
	document.querySelectorAll(".voice").forEach(elem => {
		const left = Number(elem.style.left.replace("px", ""));
		const newTiming = picoAudio.getTiming(newTimeAbsolute || newTime);
		if (left * 7 > newTiming) {
			elem.remove();
		} else if ((left + Number(elem.style.width.replace("px", ""))) * 7 > newTiming) {
			elem.style.width = newTiming / 7 - left + "px";
		}
	});
	if (playPause.getAttribute("data-playing") === "true") {
		// ボタンの中身変更
		playPause.click();
	}
}

picoAudio.addEventListener("songEnd", () => {
	skipPrevious.click();
});

// voiceToNote
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
			const playTiming = picoAudio.getTiming(getCurrentTime());
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

// PicoAudio.js 再生時間の取得
function getCurrentTime() {
	return (picoAudio.context ? picoAudio.context.currentTime : 0) - picoAudio.states.startTime;
}