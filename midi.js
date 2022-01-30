const picoAudio = new PicoAudio();
const controler = document.getElementById("controler");
const pianoRoll = document.getElementById("pianoroll");
var scrollAnime;

// ファイル読み込み部分
const fileInputE = document.getElementById("inputMidi");
fileInputE.addEventListener("change", () => {
	const file = fileInputE.files[0];
	const reader = new FileReader();
	reader.onload = () => {
		const smf = new Uint8Array(reader.result);
		const smfData = picoAudio.parseSMF(smf);
		// データセット
		picoAudio.setData(smfData);
		// ノート作成
		const pitches = smfData.channels[0].notes.map(note => note.pitch);
		const min = Math.min(...pitches);
		const max = Math.max(...pitches);
		const minPitch = (min - (300 / 7 - (max - min)) / 2) * 7;
		smfData.channels.forEach((channel, i) => {
			channel.notes.forEach(note => {
				const newNote = document.createElement("div");
				newNote.classList.add("note");
				if (i !== 0) {
					newNote.classList.add("hide");
				}
				// const soundData = Object.values(freqList).find(value => value.midinote === note.pitch);
				newNote.style.bottom = note.pitch * 7 - minPitch + "px";
				newNote.style.left = note.start / 7 + "px";
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
		controler.removeAttribute("disabled");
	};
	reader.readAsArrayBuffer(file);
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
		// pianoRoll.classList.remove("pause");
		// pianoRoll.classList.add("anime");
	} else {
		// 停止中
		controler.textContent = "再生";
		controler.setAttribute("data-playing", "false");
		picoAudio.pause();
		scrollAnime.pause();
		// pianoRoll.classList.add("pause");
	}
});

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