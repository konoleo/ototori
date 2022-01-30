function getClosestElem(num, arr) {
	num = Number(num);
	return arr.reduce((prev, curr) => {
		return (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev);
	});
}

const picoAudio = new PicoAudio();
const controler = document.getElementById("controler");
const pianoRoll = document.getElementById("pianoroll");
var scrollAnime;
var minPitch;

// ファイル読み込み部分
const fileInputE = document.getElementById("inputMidi");
fileInputE.addEventListener("change", async () => {
	const file = fileInputE.files[0];
	const reader = new FileReader();
	reader.onload = () => {
		const smf = new Uint8Array(reader.result);
		const smfData = picoAudio.parseSMF(smf);
		// データセット
		picoAudio.setData(smfData);
		// ノート作成
		const mainPitches = smfData.channels[0].notes.map(note => note.pitch);
		const min = Math.min(...mainPitches);
		const max = Math.max(...mainPitches);
		minPitch = (min - (300 / 7 - (max - min)) / 2) * 7;
		smfData.channels.forEach((channel, i) => {
			channel.notes.forEach(note => {
				const newNote = document.createElement("div");
				newNote.classList.add("note");
				if (i !== 0) {
					newNote.classList.add("hide");
				}
				// const soundData = Object.values(freqList).find(value => value.midinote === note.pitch);
				newNote.style.left = note.start / 7 + "px";
				newNote.style.bottom = note.pitch * 7 - minPitch + "px";
				newNote.style.width = (note.stop - note.start) / 7 + "px";
				pianoRoll.appendChild(newNote);
			});
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
	// 表示・非表示
	document.getElementById("inputDiv").setAttribute("hidden", "");
	document.getElementsByTagName("main")[0].removeAttribute("hidden");
});

// コントロール
controler.addEventListener("click", () => {
	picoAudio.init();
	if (controler.getAttribute("data-playing") === "false") {
		// 再生中
		controler.textContent = "一時停止";
		controler.setAttribute("data-playing", "true");
		picoAudio.play();
		scrollAnime.play();
	} else {
		// 停止中
		controler.textContent = "再生";
		controler.setAttribute("data-playing", "false");
		picoAudio.pause();
		scrollAnime.pause();
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
			var closestHz = getClosestElem(hz, Object.keys(freqList));
			var soundData = freqList[closestHz];
		} else {
			return;
		}
		const newestNote = pianoRoll.querySelector(":scope > .note.voice:last-of-type");
		const playTime = getCurrentTime();
		if (!newestNote || Number(newestNote.getAttribute("data-midinote")) !== soundData.midinote) {
			// 新しい音
			const newNote = document.createElement("div");
			newNote.classList.add("note", "voice");
			newNote.style.left = picoAudio.getTiming(playTime) / 7 + "px";
			newNote.style.bottom = soundData.midinote * 7 - minPitch + "px";
			newNote.style.width = 0;
			newNote.setAttribute("data-midinote", soundData.midinote);
			pianoRoll.appendChild(newNote);
		} else {
			// 前の音の続き
			const startTime = Number(newestNote.style.left.replace("px", ""));
			console.log((playTime - startTime) * 7);
			newestNote.style.width = Number(newestNote.style.width.replace("px", "")) + (playTime - startTime) * 7 + "px";
			console.log(soundData.japanese);
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

function getCurrentTime() {
	return (picoAudio.context ? picoAudio.context.currentTime : 0) - picoAudio.states.startTime;
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