// (async function () {
// 	// const midijson = await fetch("alps.json").then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.url}にアクセスできません。`)));
// // 	const audioCtx = new AudioContext();
// // 	// マイクから音声を取得する
// // 	const stream = await navigator.mediaDevices.getUserMedia({audio: true});
// // 	const input = audioCtx.createMediaStreamSource(stream);
// // 	// 音声の解析を行うAnalyserNodeを作成する
// // 	const analyser = audioCtx.createAnalyser();
// // 	analyser.fftSize = 2048;
// // 	// マイクからの入力をAnalyserNodeに繋げる
// // 	input.connect(analyser);
// 	const microphone = await navigator.mediaDevices.getUserMedia({audio: true});
// 	const audioCtx = new AudioContext();
// 	const analyser = audioCtx.createAnalyser();
// 	analyser.fftSize = 2048;
// 	const input = audioCtx.createMediaStreamSource(microphone);
// 	input.connect(analyser);
// 	const bufferLength = analyser.frequencyBinCount;
// 	const frequency = new Uint8Array(bufferLength);
// 	analyser.getByteFrequencyData(frequency);
// 	console.log(frequency);

// 	mediaStreamSource = audioContext.createMediaStreamSource(stream)
// 	meter = createAudioMeter(audioContext)
// 	mediaStreamSource.connect(meter)
// }());

navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
	const audioCtx = new AudioContext();
	const analyser = audioCtx.createAnalyser();
	analyser.fftSize = 2048;
	analyser.smoothingTimeConstant = 0.8;
	const input = audioCtx.createMediaStreamSource(stream);
	input.connect(analyser);
	const javascriptNode = audioCtx.createScriptProcessor(2048, 1, 1);
	analyser.connect(javascriptNode);
	javascriptNode.connect(audioCtx.destination);
	console.log(audioCtx.sampleRate);
	javascriptNode.addEventListener("audioprocess", () => {
		const frequencyData = new Uint8Array(analyser.frequencyBinCount);
		analyser.getByteFrequencyData(frequencyData);
		let values = 0;
		const length = frequencyData.length;
		for (var i = 0; i < length; i++) {
			values += (frequencyData[i]);
		}
		var average = values / length;
		if (Math.round(average) > 10) {
			console.log(Math.round(average));
		}
	});
});