const picoAudio = new PicoAudio();

// ファイルアップロード
const fileDiv = document.getElementById("fileDiv");
const fileLabel = document.getElementsByClassName("fileLabel");
const fileInputE = document.getElementsByClassName("inputJson");

// メイン
const main = document.getElementsByTagName("main")[0];
const title = document.getElementById("title");
const pianoRoll = document.getElementById("pianoroll");
const lyricsE = document.getElementById("lyrics");
const dynamicsE = document.getElementById("dynamics");

// コントロール
const timeBar = document.getElementById("timeBar");
const coloredLine = document.getElementById("coloredLine");
const currentTimeE = document.getElementById("current");
const lengthTimeE = document.getElementById("length");
const skipPrevious = document.getElementById("skipPrevious");
const replay5 = document.getElementById("replay5");
const playPause = document.getElementById("playPause");
const forward5 = document.getElementById("forward5");

// 変数
var chorusNum;
var lyricsData;
// var dynamicsData;
var scrollAnime;
var tempos;
var songLengthTimig;
var minPitch;

fileDiv.style.height = window.innerHeight + "px";
main.style.height = window.innerHeight + "px";

// ファイル読み込み
function readFile(e) {
	const file = e.target.files[0];
	const reader = new FileReader();
	reader.readAsText(file);
	reader.onload = () => {
		picoAudio.init();
		const json = JSON.parse(reader.result);
		const smf = new Uint8Array(base64ToUint8Array(json.midi_base64));
		const smfData = picoAudio.parseSMF(smf);
		// 曲名
		title.textContent = json.title;
		// jsonの中身を変数にセット
		chorusNum = json.chorusChannel;
		lyricsData = json.lyrics;
		// dynamicsData = json.dynamics;
		// const breathData = json.breath;
		// データセット
		picoAudio.setData(smfData);
		songLengthTimig = smfData.songLength;
		timeBar.setAttribute("max", Math.round(picoAudio.getTime(songLengthTimig)));
		lengthTimeE.textContent = secToMin(Math.round(picoAudio.getTime(songLengthTimig)));
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
			newNote.setAttribute("data-start", note.start);
			newNote.setAttribute("data-stop", note.stop);
			pianoRoll.appendChild(newNote);
		});
		// ブレス
		// breathData.forEach(data => {
		// 	const newDiv = document.createElement("div");
		// 	newDiv.classList.add("breath");
		// 	newDiv.style.left = data.timing / 7 + "px";
		// 	if (data.parentheses) {
		// 		newDiv.innerHTML = "&#xE676;&#xE4D0;&#xE677;";
		// 	} else {
		// 		newDiv.innerHTML = "&#xE4D0;";
		// 	}
		// 	pianoRoll.appendChild(newDiv);
		// });
		// スクロール設定
		let keyframes = [{
			transform: "translateX(0)",
			offset: 0
		}];
		tempos = smfData.tempoTrack;
		for (let i = 0; i < tempos.length; i++) {
			const nextTempoData = tempos[i + 1];
			if (songLengthTimig !== tempos[i].timing) {
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
		skipPrevious.click();
		scrollAnime.pause();
		scrollAnime.oncancel = () => {
			scrollAnime.play();
			scrollAnime.pause();
		};
		// 歌詞・強弱記号の表示
		displayLyricsSigns(0);
	};
}
fileInputE[0].addEventListener("change", (e) => {
	readFile(e);
	// 表示・非表示
	fileDiv.setAttribute("hidden", "");
	main.removeAttribute("hidden");
	fileInputE[1].addEventListener("change", (e) => {
		readFile(e);
	});
}, {once: true});
function base64ToUint8Array(base64Str) {
	const raw = atob(base64Str);
	return Uint8Array.from(Array.prototype.map.call(raw, (x) => { 
		return x.charCodeAt(0); 
	}));
}

// 歌詞・強弱記号の表示
function displayLyricsSigns(timing) {
	const currentTiming = timing !== undefined ? timing : picoAudio.getTiming(getCurrentTime());
	// 歌詞
	const lyricIndex = getBiggerClosestNum(currentTiming, lyricsData.map(elem => elem.endTiming));
	for (let i = 0; i < lyricsE.children.length; i++) {
		const elem = lyricsE.children[i];
		if (lyricsData.length - 1 < lyricIndex + i || lyricIndex === -1) {
			elem.innerHTML = "&nbsp;";
			elem.classList.remove("active");
		} else {
			const data = lyricsData[lyricIndex + i];
			elem.textContent = data.lyric;
			if (data.startTiming <= currentTiming && currentTiming <= data.endTiming) {
				elem.classList.add("active");
			} else {
				elem.classList.remove("active");
			}
		}
	}
	// 強弱記号
	// const dynamicsIndex = getBiggerClosestNum(currentTiming, dynamicsData.map(elem => elem.endTiming));
	// const signs = dynamicsE.querySelectorAll(".sign");
	// const arrow = dynamicsE.querySelector(".arrow");
	// if (dynamicsData[dynamicsIndex - 1] && dynamicsData[dynamicsIndex - 1].endTiming <= currentTiming && currentTiming <= dynamicsData[dynamicsIndex].startTiming) {
	// 	const dynamicsNums = [];
	// 	signs.forEach((elem, i) => {
	// 		const unicodeData = dynamicsToUnicode[dynamicsData[dynamicsIndex + i - 1].dynamicSign];
	// 		elem.innerHTML = unicodeData.unicode;
	// 		dynamicsNums.push(unicodeData.num);
	// 	});
	// 	if (dynamicsData[dynamicsIndex - 1].gradually === false) {
	// 		arrow.textContent = "arrow_right_alt";
	// 		arrow.classList.add("material-icons-round");
	// 	} else {
	// 		arrow.innerHTML = dynamicsToUnicode[Math.sign(dynamicsNums[1] - dynamicsNums[0]) === 1 ? "cresc" : "decresc"];
	// 		arrow.classList.remove("material-icons-round");
	// 	}
	// 	[arrow, ...signs].forEach(elem => {
	// 		elem.removeAttribute("hidden");
	// 	});
	// } else if (dynamicsIndex !== -1) {
	// 	signs[0].innerHTML = dynamicsToUnicode[dynamicsData[dynamicsIndex].dynamicSign].unicode;
	// 	signs[0].removeAttribute("hidden");
	// 	[arrow, signs[1]].forEach(elem => {
	// 		elem.setAttribute("hidden", "");
	// 	});
	// } else {
	// 	signs[0].setAttribute("hidden", "");
	// }
}
function getBiggerClosestNum(num, arr) {
	num = Number(num);
	const value = Math.min(...arr.filter(elem => elem > num));
	return arr.indexOf(value);
}
const dynamicsToUnicode = {
	ppp: {
		unicode: "&#xE52A;",
		num: -4
	},
	pp: {
		unicode: "&#xE52B;",
		num: -3
	},
	p: {
		unicode: "&#xE520;",
		num: -2
	},
	mp: {
		unicode: "&#xE52C;",
		num: -1
	},
	mf: {
		unicode: "&#xE52D;",
		num: 1
	},
	f: {
		unicode: "&#xE522;",
		num: 2
	},
	ff: {
		unicode: "&#xE52F;",
		num: 3
	},
	fff: {
		unicode: "&#xE530;",
		num: 4
	},
	cresc: "&#xE53E;",
	decresc: "&#xE53F;"
}

// 再生/停止
var timeBarTimer;
var lyricsSignsTimer;
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
		lyricsSignsTimer = setInterval(displayLyricsSigns, 100);
	} else {
		// 停止する
		playPause.textContent = "play_arrow";
		playPause.setAttribute("title", "再生");
		playPause.setAttribute("data-playing", "false");
		picoAudio.pause();
		scrollAnime.pause();
		clearInterval(timeBarTimer);
		clearInterval(lyricsSignsTimer);
	}
});

// タイムバー
timeBar.addEventListener("input", () => {
	skip(Number(timeBar.value), "absolute", "input");
});
timeBar.addEventListener("change", () => {
	skip(Number(timeBar.value), "absolute", "change");
});

function changeTimeBar(num) {
	timeBar.value = (num === 0 || num) ? num : Math.round(getCurrentTime());
	coloredLine.style.width = `calc((100% - 16px) / ${timeBar.getAttribute("max")} * ${Number(timeBar.value)} + 8px)`;
	currentTimeE.textContent = secToMin(Number(timeBar.value));
}
function secToMin(sec) {
	return Math.floor(sec / 60) + ":" + (sec % 60).toString().padStart(2, "0");
}

// 最初に戻す
skipPrevious.addEventListener("click", () => {
	picoAudio.initStatus();
	scrollAnime.cancel();
	displayLyricsSigns(0);
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

function skip(second, type, eventName) {
	if (eventName === "input" && !timeBar.hasAttribute("data-playing")) {
		timeBar.setAttribute("data-playing", playPause.getAttribute("data-playing"));
		if (playPause.getAttribute("data-playing") === "true") {
			playPause.click();
		}
	}
	const songLengthTime = picoAudio.getTime(songLengthTimig);
	const currentTime = scrollAnime.currentTime / 1000;
	const playing = playPause.getAttribute("data-playing");
	if (currentTime >= songLengthTime && Math.sign(second) === 1) {
		// 曲の長さを超える場合
		skipPrevious.click();
		return;
	}
	if (playPause.getAttribute("data-playing") === "false") {
		playPause.click();
	}
	if (type === "absolute") {
		var newTimeAbsolute = second;
		second = second - currentTime;
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
	displayLyricsSigns();
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
		playPause.click();
	}
	if (playing === "true") {
		// 再生中だった場合
		playPause.click();
	}
	if (eventName === "change") {
		if (timeBar.getAttribute("data-playing") === "true") {
			playPause.click();
		}
		timeBar.removeAttribute("data-playing");
	}
}

picoAudio.addEventListener("songEnd", () => {
	skipPrevious.click();
});

// 声をNoteに変換
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
			const closestHz = getClosestNum(hz, Object.keys(freqList));
			const soundData = freqList[closestHz];
			const newestNote = pianoRoll.querySelector(":scope > .note.voice:last-of-type");
			const currentTime = getCurrentTime();
			const correctionTime = tempos.filter((tempo) => {
				if (tempo.time < currentTime) {
					return tempo.value;
				} else {
					return false;
				}
			}).slice(-1)[0].value * 0.0005 + 0.2883;
			const playTiming = picoAudio.getTiming(currentTime - correctionTime);
			if (!newestNote || playTiming - Number(newestNote.getAttribute("data-end")) > 100 || Number(newestNote.getAttribute("data-midinote")) !== soundData.midinote) {
				// 新しい音
				const newNote = document.createElement("div");
				newNote.classList.add("note", "voice");
				newNote.style.left = playTiming / 7 + "px";
				newNote.style.bottom = soundData.midinote * 7 - minPitch + "px";
				newNote.style.width = 0;
				newNote.setAttribute("data-midinote", soundData.midinote);
				newNote.setAttribute("data-start", playTiming);
				newNote.setAttribute("data-end", playTiming);
				pianoRoll.appendChild(newNote);
			} else {
				// 前の音の続き
				const startTiming = Number(newestNote.getAttribute("data-start"));
				newestNote.style.width = (playTiming - startTiming) / 7 + "px";
				newestNote.setAttribute("data-end", startTiming + Number(newestNote.style.width.replace("px", "")) * 7);
			}
		}
	}

	var timer;
	picoAudio.addEventListener("play", () => {
		timer = setInterval(voiceToNote, 10);
	});
	picoAudio.addEventListener("pause", () => {
		clearTimeout(timer);
	});
}());
function getClosestNum(num, arr) {
	num = Number(num);
	return arr.reduce((prev, curr) => {
		return (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev);
	});
}

// PicoAudio.js 再生時間の取得
function getCurrentTime() {
	return (picoAudio.context ? picoAudio.context.currentTime : 0) - picoAudio.states.startTime;
}