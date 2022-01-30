function getClosestElem(num, arr) {
	num = Number(num);
	return arr.reduce((prev, curr) => {
		return (Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev);
	});
}

const notes = document.getElementById("notes");

(async function () {
	const freqList = await fetch("freqList.json").then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.url}にアクセスできません。`)));

	window.addEventListener("click", () => {
		navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
			const audioCtx = new AudioContext({sampleRate: 44100});
			const analyser = audioCtx.createAnalyser();
			analyser.fftSize = 16384;
			const input = audioCtx.createMediaStreamSource(stream);
			input.connect(analyser);
			const frequencyData = new Uint8Array(analyser.frequencyBinCount);
			const javascriptNode = audioCtx.createScriptProcessor(2048);
			analyser.connect(javascriptNode);
			javascriptNode.connect(audioCtx.destination);
			const unit = audioCtx.sampleRate / analyser.fftSize;
			javascriptNode.addEventListener("audioprocess", () => {
				analyser.getByteFrequencyData(frequencyData);
				const maxValue = Math.max(...frequencyData);
				const index = frequencyData.indexOf(maxValue);
				if (maxValue > 200 && index !== 0) {
					const hz = Math.round(index * unit);
					document.getElementById("freq").style.left = hz + "px";
					var closestHz = getClosestElem(hz, Object.keys(freqList));
					var soundData = freqList[closestHz];
				} else {
					document.getElementById("freq").style.left = 0 + "px";
					var soundData = {
						japanese: "休み",
						international: "rest"
					};
				}
				const newestNote = notes.querySelector(":scope > .note:last-of-type");
				if (!newestNote || newestNote.getAttribute("data-international") !== soundData.international) {
					const newNote = document.createElement("div");
					newNote.classList.add("note");
					newNote.textContent = `${soundData.japanese} (${closestHz || soundData.international})`;
					newNote.setAttribute("data-international", soundData.international);
					newNote.style.width = 0;
					notes.appendChild(newNote);
				} else {
					newestNote.style.width = Number(newestNote.style.width.replace("px", "")) + 0.5 + "px";
					console.log(newestNote.style.width);
				}
			});
		});
	});
}());