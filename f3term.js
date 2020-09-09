// Полезные вспомогательные функции

function isAlpha(c) {
	const alphas = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return (alphas.indexOf(c) != -1);
}

function isDigit(c) {
	const digits = "0123456789";
	return (digits.indexOf(c) != -1);
}

function isAlphaNum(c) {
	return (isAlpha(c) || isDigit(c));
}

function getRandomInt(min, max) {
	const lMin = Math.ceil(min);
	const lMax = Math.floor(max);
	return Math.floor(Math.random() * (lMax - lMin + 1)) + lMin; //Максимум и минимум включаются
}

function pad(num, size) {
    let s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function compareWords(word, passWord) {
	let count = 0;
	for (let i = 0; i < passWord.length; i++) {
		if (passWord[i] == word[i]) {
			count++;
		}
	}
	return count;
}

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
	  let j = Math.floor(Math.random() * (i + 1));
	  [array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

// Поле 2х16х16, черт с ней с аутентичностью.

export default class gameHackTerminal {
	numRows = 16;
	numChars = 16;
	grbChars = ["~", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+",
					"-", "=", "?", "|", ".", ",", "!", "&lt;", "&gt;", "{", "}", "[", "]"];
	leftBrackets = ["(", "[", "{", "&lt;"];
	rightBrackets = [")", "]", "}", "&gt;"];

	
	constructor ({
		gameData = {	// То, что передаётся из приложения на Питоне.
			password: 'AARDVARK',
			numTries: 4,
			timeOut: 600,		// Счетчик обратного отсчёта, секунды. 0 - нет отсчёта. 
			chanceTries: 0.2, 	// Вероятность при чите восстановить попытки
			falseWords: ['DESCRIBE', 'LINGERIE', 'MCMILLEN', 'OPPERMAN', 'PAVEMENT', 'QUANTITY', 'REVERENT'],
			header: ' ROBCO INDUSTRIES 2077',
			footer: 'FALLOUT TERMINAL'
		}
	} = {}) {
		this.timeОut = gameData.timeOut;
		this.password = gameData.password;
		this.chanceTries = gameData.chanceTries;
		this.numTries = gameData.numTries; 	// Эталонное висло попыток
		this.tries = gameData.numTries;		// Рабочее (текущее) число попыток
		this.falseWords = gameData.falseWords;
		this.lenWord = gameData.password.length; // Длина слова
		this.numWords = gameData.falseWords.length + 1; // Длина списка слов + пароль
		this.passPos = getRandomInt(0, this.numWords - 1); // Позиция пароля в списке слов
		this.serviceTxt = ["<br>", "<br>", "<br>", "<br>", "<br>", "<br>", "<br>", "<br>", 
								"<br>", "<br>", "<br>", "<br>", "<br>", "<br>", "<br>", "<br>" ];
		this.numGarbage = 2 * (this.numRows * this.numChars); // Общий размер игрового поля
		this.leftCheat = -1; 	// Позиция найденного чита начало
		this.rightCheat = -1;	// Позиция найденного чита конец
		this.wordList = [];		// Список слов вместе с паролем
		this.grbStrTagged = [];	// "Мусорная" строка с тэгами
		this.grbStrClear = [];	// "Мусорная" строка в чистом виде посимвольно
		this.posWords = [];		// Позиции слов внутри мусорной строки
		this.numGarbage = this.numRows * this.numChars *2; // Размер мусорной строки
		this.leftIdx = '';	// Левое поле индекса (адреса)
		this.rightIdx = '';	// Правое поле индекса (адреса)
		this.leftTxt = '';	// Левое поле текста
		this.rightTxt = ''; // Правое поле текста

		this.rootElement = document.querySelector(".screen__content"); // Основной элемент интерфейса
		
		// Заполняем массивы
		this.wordList = this.initWordList(this.passPos, gameData.password, this.numWords, gameData.falseWords);
		this.posWords = this.initWordPos(this.numRows, this.numChars, this.numWords, this.lenWord);
		this.grbStrClear = this.initGrbClear(this.numGarbage, this.posWords, this.lenWord, this.wordList, this.grbChars);
		this.grbStrTagged = this.initGrbTagged(this.grbStrClear, this.wordList);
		[this.leftIdx, this.rightIdx] = this.initIdx(this.numRows, this.numChars);
		[this.leftTxt, this.rightTxt] = this.initTxt(this.numRows, this.numChars, this.grbStrTagged);

		this.render();
		this.serviceField = document.querySelector(".service"); // Поле сервисного "журнала"
		this.initEventListeners();
		this.startTimer(this.timeОut);
	}

	initEventListeners() {
		this.rootElement.addEventListener("pointerover", this.onHover);
		this.rootElement.addEventListener("pointerout", this.onOut);
		this.rootElement.addEventListener("pointerdown", this.onClick);
	}
	  
	destroyEventListeners() {
		this.rootElement.removeEventListener("pointerover", this.onHover);
		this.rootElement.removeEventListener("pointerout", this.onOut);
		this.rootElement.removeEventListener("pointerdown", this.onClick);
  	}

	dummy() {
		return false;
	}

	onClick = (event) => {
		let curElem = event.target;	// Текущий элемент, на котором кликнули current element
		// console.log(curElem.className);
		if (curElem.className.indexOf('word') >=0 ) { 	// Кликнули на слово
			this.clickOnWord(curElem);
		} else if (curElem.className.indexOf('char') >=0 ){ // Кликнули на символ
			this.clickOnChar(curElem);
		}	
	}	

	onOut = (event) => {
		let curElem = event.target; 			// Текущий, current element, с которого ушла мышь
		curElem.classList.remove('highlight');	// Перекрашиваем его в нормальный цвет по факту ухода
		if (this.leftCheat >=0 || this.rightCheat >= 0) {
			for (let i = this.leftCheat; i <= this.rightCheat; i++) { // Мы красили ранее чит и ушли с него! Покрасим его обратно.
				curElem.parentNode.querySelector(`[data-element="idx-${i}"]`).classList.remove('highlight');
			}
			this.leftCheat = -1;	// Левая граница чита глобально - ушли с чита, значит вовзращаем индесы на место
			this.rightCheat = -1;	// Правая граница чита глобально - ушли с чита, значит вовзращаем индесы на место
		}
		if (curElem.className == "word") {
			this.delTmpServiсe(this.serviceField);
		}	
	}

	onHover = (event) => {
		let curElem = event.target; 		// Текущий, current element, на который пришла мышь
		let prevElem = event.relatedTarget;	// Предыдущий, previous element, с которого ушла мышь
		if (curElem.className === 'char' || curElem.className === 'word') {
			if (prevElem != null) { // Предыдущий элемент, с которого ушли, не пустой.
				if (prevElem.className === 'char' || prevElem.className === 'word') { 
					prevElem.classList.remove('highlight'); // Если ушли со слова или знака - перекрасим в нормальный стиль.
				}
			}	
			if (curElem.className === 'char') {
				[this.leftCheat, this.rightCheat] = this.checkCheat(curElem);
				if (this.leftCheat >= 0 && this.rightCheat >= 0) {
					for (let i = this.leftCheat; i <= this.rightCheat; i++) {
						curElem.parentNode.querySelector(`[data-element="idx-${i}"]`).classList.add('highlight');
					}
				}
			} else { // Выбрали слово
				// document.getElementById('sel_word').play(); 
				this.addTmpServiсe(this.serviceField, curElem.dataset.element);
			}
			curElem.classList.add('highlight');
		}
	}

	clickOnWord(element) {
		const curId = element.dataset.element;
		const numLetters = compareWords(curId, this.password); // Сравниваем выбранное слово с паролем по буквам
		if (numLetters == this.lenWord)  { // Слово свопало с паролем
			this.gameWin();	// Выиграли
			return;
		} else { // Слово не совпало с паролем
			this.tries--;	// Уменьшаем число попыток
			this.numTriesShow(this.tries);	// Отображаем уменьшенный результат
			if (this.tries == 0) { // Все попытки исчерпаны
				this.gameLose();	// Проиграли
				return;
			}
			this.delTmpServiсe(this.serviceField);
			this.addServiсe(this.serviceField, `${curId} <br> ${numLetters} of ${this.lenWord}<br>`); // Выводим результат сравнения
		}
	}

	clickOnChar(element) {
		let i = 0;
		let flag = 0;
		const chance = Math.random();
		if (this.leftCheat >= 0 && this.rightCheat >= 0) { // Кликнули на скобке и ранее обнаружен удачный чит
			for (i = this.leftCheat; i <= this.rightCheat; i++) {
				element.parentNode.querySelector(`[data-element="idx-${i}"]`).innerHTML = '.';
				element.parentNode.querySelector(`[data-element="idx-${i}"]`).classList.remove('highlight');
				this.grbStrClear[i] = '.';
			}	
			if (chance <= this.chanceTries) { 	// Повезло. восстанавливаем попытки!
				this.tries = this.numTries;
				this.numTriesShow(this.tries);	// Отображаем результат
				this.addServiсe(this.serviceField, "Tries restored!<br>");
			} else { // Убираем слово-заглушку
				const dWord = this.selectDummyWord();
				if (dWord === 'undefined') { 		// Слова кончились, восстанавливаем попытки!
					this.tries = this.numTries;
					this.numTriesShow(this.tries);	// Отображаем результат
				}
			}	
		}	
	}

	selectDummyWord() {
		const idxDumb = getRandomInt(0, this.falseWords.length-1);	// Выбираем случайное слово - не пароль.
		let wordSel = this.rootElement.querySelector(`[data-element="${this.falseWords[idxDumb]}"]`);
		let i = 0, flag = 0;
		if (wordSel == undefined) { // Кончились "заглушки"
			return undefined;
		} else {
			this.falseWords.splice(idxDumb, 1);	// Удаляем выбранное слово из массива.
			let newWord = '';
			this.addServiсe(this.serviceField, "DUMMY REMOVED!<br>");
			for (i = 0; i < wordSel.innerHTML.length; i++) {	// Перебираем выбранное слово посимвольно.
				if (flag == 0 && wordSel.innerHTML[i] == '<') { // Нашли тэг <br>, выставляем флаг, что надо копировать тэг.
					flag = 1;
					newWord += wordSel.innerHTML[i];
					continue;
				}
				if (flag == 1 && wordSel.innerHTML[i] == '>') { // Тэг закончился, скопировн, флаг обнулили.
					newWord += wordSel.innerHTML[i];
					flag = 0;
					continue;
				}	
				if (flag == 1) { // Копируем тэг без изменений в новое "слово".
					newWord += wordSel.innerHTML[i];
					continue;
				}	
				newWord += '<span data-element=\"dot\" class=\"char\">.</span>'; // Все символы в слове, кроме тэга, заменяем точками.
			}
			wordSel.innerHTML = newWord; 	// Заменили в документе слово точками.
			wordSel.dataset.element = ''; 	// Обнулили ID
		}
	}

	checkCheat(element) {
		let left = -1, right = -1; // Левая и правая границы чита
		let i = 0, j = 0;
		const curId = element.dataset.element.slice(4); // Позиция в массиве grb_str_clear
		const leftBorder = Math.floor(curId / this.numChars) * this.numChars; // Левая граница строки 
		const rightBorder = leftBorder + this.numChars;	// Правая граница строки
		let leftIdx = this.leftBrackets.indexOf(this.grbStrClear[curId]); 	// Проверяем, является ли символ левой скобкой
		let rightIdx = this.rightBrackets.indexOf(this.grbStrClear[curId]);	// Проверяем, является ли символ правой скобкой
		if (leftIdx >= 0) { // Символ  - левая скобка
			let rightBrk = this.rightBrackets[leftIdx]; // Выбираем к ней правую пару
			[left, right] = this.selectCheat(curId, rightBorder, rightBrk); 
		} else if (rightIdx >= 0) { // Это правая скобка
				let leftBrk = this.leftBrackets[rightIdx]; // Выбираем к ней левую пару
				[left, right] = this.selectCheat(curId, leftBorder, leftBrk); 
		}
		return [left, right];
	}

	selectCheat(startPos, endPos, bracket) { // Проверяем чит.
		if (startPos < endPos) {
			for(let i = startPos; i < endPos; i++) {
				switch (this.checkCharCheat(i, bracket)) {
					case -1: return [-1, -1];		// Cлово
					case 1:  return [startPos, i]; 	// Чит
				}
			}
		} else {
			for(let i = startPos; i > endPos; i--) {
				switch (this.checkCharCheat(i, bracket)) {
					case -1: return [-1, -1];		// Cлово
					case 1: return [i, startPos]; 	// Чит
				}
			}
		}
		return [-1, -1]; // Не нашли.
	}

	checkCharCheat(i, bracket) {
		if (isAlpha(this.grbStrClear[i])) { 
			return (-1); // Слово. Точно нет чита
		} else if (this.grbStrClear[i] === bracket) { 
			return (1); // Чит
		} else {
			return (0); // Не символ, возможно чит дальше
		}
	}

	initWordList(passPos, pwd, numWords, falseWords) { // Генерация массива слова и пароля вместе
		let wList = [];
		let i = 0, j = 0;
		for (i = 0; i < numWords; i++) { // Генерируем
			if (i == passPos) {
				wList[i] = pwd;
			} else {
				wList[i] = falseWords[j++];
			}
		}
		return (shuffleArray(wList)); // Перемешать и вернуть
	}

	initWordPos(numRows, numChars, numWords, lenWord) {
		const deltaWords = 2*(numRows*numChars)/numWords; // "Диапазон" внутри мусорный строки для размещения каждого слова
		let wPos = [];
		let i = 0;
		for (i = 0; i < numWords; i++) {
			wPos[i] = getRandomInt(i * deltaWords, (i + 1) * deltaWords - lenWord - 1); // Не доходя до конца диапазона на 1
		}
		return wPos;
	} 

	initGrbClear(numGarbage, posWords, wordLen, wordList, grbChars) {
		let grbStr = [];
		let i = 0, j = 0, wordFlag = 0;
		const grbLen = grbChars.length;
		for (i = 0; i < numGarbage; i++) {
			if (posWords.includes(i) || (wordFlag > 0 && wordFlag < wordLen)) { // Дошли до слова, но ещё не конец
				grbStr[i] = wordList[j].slice(wordFlag,wordFlag+1); // Добавляем слово посимвольно
				wordFlag++;
				continue;
			} else if (wordFlag === wordLen) { // Всё, конец слова!
				j++;
				wordFlag=0;
			}
			grbStr[i] = grbChars[getRandomInt(0, grbLen - 1)];
		}	
		return grbStr;
	}

	initGrbTagged(grbChars, wordList) {
		let i = 0, j = 0, wordFlag = 0, charFlag = 0, tLast = '';
		let grbTagged = [];
		grbChars.forEach(character => {
			charFlag = isAlpha(character);
			if(charFlag && wordFlag === 0) { // Начали слово
				grbTagged.push(`<span class=\"word\" data-element=\"${wordList[j]}\">${character}`);
				wordFlag = 1;
				j++;
			} else if (charFlag && wordFlag > 0) {
				grbTagged.push(`${character}`);
			} else if (wordFlag > 0) {
				wordFlag = 0;
				grbTagged.push(grbTagged.pop() + "</span>");
				grbTagged.push(`<span class=\"char\" data-element=\"idx-${i}\">${character}</span>`);
			} else {
				grbTagged.push(`<span class=\"char\" data-element=\"idx-${i}\">${character}</span>`);
			}
			i++;
		});
		return grbTagged;
	}

	initIdx(numRows, numCols) {
		let i = 0;
		let left = '', right = '';
		let startIdx = getRandomInt(0x1000,0xFFFF-513);
		for (i = 0; i < numRows; i++) {
			left += '0x' + startIdx.toString(16).toUpperCase() + '<br>';
			right += '0x' + (startIdx + numRows * numCols).toString(16).toUpperCase() + '<br>';
			startIdx += numCols;
		}
		return [left, right];
	}

	initTxt(numRows, numCols, grbTag) {
		let i = 0, j = 0;
		let left = '', right = '';
		for (i = 0; i < numRows; i++) {
			for (j = 0; j < numCols; j++) {
				left += grbTag[i * numCols + j];
				right += grbTag[(i + numCols) * numCols + j];
			}
			left += "<br>";
			right += "<br>";
		}
		return [left, right];
	}

	template() {
		return `
		<div class="interface">
			<div class="interface_header">
			<p data-element="status">-----</p>
			<p> TRIES LEFT: <span data-element="tries">${"* ".repeat(this.tries)}</span></p>
			</div>
			<div class="timer"></div>
			<div class="interface_content">
			<div class="idx left_idx">${this.leftIdx}</div>
			<div class="content_left">${this.leftTxt}</div>
			<div class="idx right_idx">${this.rightIdx}</div>
			<div class="content_right">${this.rightTxt}</div>
			<div class="content_service">
				<div class="cursor">${"<br>".repeat(15)} > </div>
				<div class="service" data-element="log">${"<br>".repeat(16)}</div>
			</div>
			</div>
		</div>
		`
	}

	gameLose () { // Проигрыш
		this.destroyEventListeners();
		let  strLose = "You LOSE! ";
		if (this.tries <=0) {
			strLose += "Tries is over! ";
		}
		if (this.timeOut >0) {
			clearInterval(timerFunc);	
			if (this.timeOut <= 0) {
				strLose += "Time is out! ";
			}
		}
		this.rootElement.querySelector("[data-element=\"tries\"]").innerHTML = strLose;
	}
	
	gameWin () { // Выигрыш
		this.destroyEventListeners();
		if (this.timeOut >0) {
			clearInterval(timerFunc);	
		}
		this.rootElement.querySelector("[data-element=\"tries\"]").innerHTML = "You WIN! Access GRANTED!";
	}

	addTmpServiсe(field, word) {
		this.serviceTxt[15] = word;
		field.innerHTML = this.serviceTxt.join("");
	}
	
	delTmpServiсe(field) {
		this.serviceTxt[15] = "<br>";
		field.innerHTML = this.serviceTxt.join("");
	}
	
	addServiсe(field, word) {
		this.serviceTxt.splice(0, this.countStr(word,"<br>")+1);
		word.split("<br>").forEach(element => {
			this.serviceTxt.push(element+"<br>");	
		});
		field.innerHTML = this.serviceTxt.join("");
	}
	
	countStr(str, substr) {
		let count = -1, index = 0;
		for (index = 0; index != -1; count++) {
			index = str.indexOf(substr, index + 1);
		} 
		return count;
	}

	numTriesShow(numTries) {
		this.rootElement.querySelector(`[data-element="tries"]`).innerHTML = "* ".repeat(numTries);
	}	

	render() {
		this.rootElement.innerHTML = this.template();
	}	

	startTimer(timeOut) {
		if (timeOut <= 0) {
		  // тут, кмк, достаточно вот так сделать
		  this.subElements.timer.innerHTML = "";
		  return;
		}
		const timerFunc = () => setInterval(() => {
			let seconds = timeOut % 60,
				minutes = timeOut / 60 % 60,
				hour = timeOut / 60 / 60 % 60;
			// Условие если время закончилось то...
			if (timeOut <= 0) {
				// Таймер удаляется
				clearInterval(timerFunc);
				console.log('game lost');
			} else { // Иначе
				// Создаём строку с выводом времени
				let strSec = pad(parseInt(seconds, 10).toString(), 2);
				let strMin = pad(parseInt(Math.trunc(minutes), 10).toString(), 2);
				let strHour = pad(parseInt(Math.trunc(hour), 10).toString(), 2);
				let strOut = `${strHour}:${strMin}:${strSec}`;
				// Выводим строку в блок для показа таймера
				this.rootElement.querySelector(".timer").innerHTML = strOut;
			}
			--timeOut; // Уменьшаем таймер
		}, 1000)
		timerFunc();
	}
};



/* 

const timer = document.querySelector(".timer");

function startTimer(timeOut) {
	if (timeOut <= 0) {
		timer.style.display = "none";
		return;
	}
	timerFunc = setInterval(function useTimer() {
		let seconds = timeOut%60; // Получаем секунды
		let minutes = timeOut/60%60; // Получаем минуты
		let hour = timeOut/60/60%60; // Получаем часы
		// Условие если время закончилось то...
		if (timeOut <= 0) {
				// Таймер удаляется
				clearInterval(timerFunc);
				gameLose(); // Проиграли!
		} else { // Иначе
				// Создаём строку с выводом времени
				let str_sec = pad(parseInt(seconds, 10).toString(), 2);
				let str_min = pad(parseInt(Math.trunc(minutes), 10).toString(), 2);
				let str_hour = pad(parseInt(Math.trunc(hour), 10).toString(), 2);
				let str_out = `${str_hour}:${str_min}:${str_sec}`;
				// Выводим строку в блок для показа таймера
				timer.innerHTML = str_out;
		}
		--timeOut; // Уменьшаем таймер
	}, 1000)
}	

startTimer(600);



*/