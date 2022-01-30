const paddingZero = (number) => {
	if(number < 10) {
		return ('00' + number).slice(-2)
	}
	return number
}

const startTime = new Date().getTime()

const showTimer = () => {
	const currentTime = new Date().getTime()
	const elapsedTime = new Date(currentTime - startTime)

	const h = elapsedTime.getHours()
	const m = elapsedTime.getMinutes()
	const s = elapsedTime.getSeconds()

	process.stdout.write(h + ":" + m + ":" + s + '\r')

	const timerId = setTimeout(showTimer,10)

}

showTimer()