'use strict';

/**
 * Exception for the maths expression format errors.
 *
 * @param {String} message
 */
function ExpressionFormatException(message) {
	this.message = message;
	this.name = 'ExpressionFormatException';
}

var Calculator = {
	tokens: [], // Mathematical expression tokens.

	/**
	 * Check if an input is numeric.
	 *
	 * @param {Mixed} input
	 * @return {Boolean}
	 */
	isNumber: function(input) {
		return !isNaN(parseFloat(input)) && isFinite(input);
	},

	/**
	 * Check if an input is integer.
	 *
	 * @param {Mixed} input
	 * @return {Boolean}
	 */
	isInteger: function(input) {
		return !isNaN(parseInt(input, 10));
	},

	/**
	 * Shunting-yard algorithm.
	 * Translate mathematical expressions from infix notation to RPN.
	 *
	 * @return {Array}
	 */
	shuntingYard: function() {
		var token,
			outputQueue = [],
			operatorStack = [],
			precedence = {'+': 2, '-': 2, '*': 3, '/': 3, '^': 4},
			associativity = {'+': 'left', '-': 'left', '*': 'left', '/': 'left', '^': 'right'},
			o2,
			i;

		while (this.tokens.length) {
			// Read token.
			token = this.tokens.shift();

			if (this.isNumber(token)) {
				// Number.
				outputQueue.push(token);
			} else if (/^[-+*\/\^]$/g.test(token)) {
				// Operator.
				for (i = operatorStack.length - 1; i >= 0; --i) {
					o2 = operatorStack[i];

					if ((associativity[token] === 'left' && precedence[token] <= precedence[o2])
						|| (associativity[token] === 'right' && precedence[token] < precedence[o2])) {
						outputQueue.push(o2);
						operatorStack.pop();
					} else {
						break;
					}
				}

				// Add current operator to stack.
				operatorStack.push(token);
			} else if (token === '(') {
				// Left parenthesis.
				operatorStack.push(token);
			} else if (token === ')') {
				// Right parenthesis.
				while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
					outputQueue.push(operatorStack.pop());
				}

				// Pop left parenthesis.
				operatorStack.pop();
			}
		}

		// Pop remaining operators.
		if (operatorStack.length) {
			while (operatorStack.length) {
				outputQueue.push(operatorStack.pop());
			}
		}

		return outputQueue;
	},

	/**
	 * Evaluate RPN expression.
	 *
	 * @param {Array} input
	 * @return {Number}
	 */
	evaluateRPN: function(input) {
		var stack = [],
			i,
			first,
			second;

		for (i = 0; i < input.length; ++i) {
			if (this.isNumber(input[i])) {
				stack.push(input[i]);
			} else {
				second = stack.pop();
				first = stack.pop();

				switch (input[i]) {
					case '*':
						stack.push(first * second);
						break;
					case '/':
						stack.push(first / second);
						break;
					case '-':
						stack.push(first - second);
						break;
					case '+':
						stack.push(first*1 + second*1);
						break;
					case '^':
						stack.push(Math.pow(first, second));
						break;
				}
			}
		}

		return stack.pop();
	},

	/**
	 * Parse input mathematical expression.
	 *
	 * @param {String} input
	 */
	read: function(input) {
		var i,
			token = '',
			operators = '+-*/()^';

		for (i = 0; i < input.length; ++i) {
			if (input[i] === '.') { // Decimal point.
				if (token.indexOf('.') === -1) {
					token += '.';
				}
			} else if (this.isInteger(input[i])) { // Integer.
				if (token === '-' && (this.tokens.length === 0 || operators.indexOf(this.tokens[this.tokens.length - 1]) !== -1)) {
					token += input[i];
				} else if (operators.indexOf(token) === -1) {
					token += input[i];
				} else {
					if (token !== '') {
						// Push operator to queue.
						this.tokens.push(token);
					}
					
					token = input[i];
				}
			} else if (operators.indexOf(input[i]) !== -1) { // Operator.
				if (token !== '') {
					// Push number to queue.
					this.tokens.push(token);
				}

				token = input[i];
			} else {
				// Unidentified character.
				throw new ExpressionFormatException('Your expression contains unidentified character(s).');
				break;
			}
		}

		if (token !== '') {
			this.tokens.push(token);
		}
	}
};

var roomInput = '';

if (typeof process.argv[2] !== 'undefined') {
	roomInput = process.argv[2];
} else {
	console.log('Usage: ' + process.argv[0] + ' ' + process.argv[1] + ' [gitter_username/gitter_room]');
	process.exit(1);
}

var config = require('./config');
var Gitter = require('node-gitter');
var gitter = new Gitter(config.token);

gitter.rooms.join(roomInput).then(function(room) {
	var events = room.listen();

	events.on('message', function(message) {
		var expression,
			RPN,
			result;

		if (message.text.indexOf('calc ') === 0) {
			expression = message.text.replace('calc ', '');

			try {
				Calculator.read(expression.replace(/ /g, ''));
				RPN = Calculator.shuntingYard();
				result = Calculator.evaluateRPN(RPN);
				room.send(expression + '=' + result);
			} catch(e) {
				room.send(e.message);
			}
		}
	});
});