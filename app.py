from flask import Flask, render_template, request, jsonify
import math
import numpy as np
from decimal import Decimal, getcontext
import re

app = Flask(__name__)

# Set precision for decimal calculations
getcontext().prec = 50

class ScientificCalculator:
    def __init__(self):
        self.memory = 0
        self.history = []
    
    def basic_operation(self, num1, num2, operation):
        """Perform basic arithmetic operations"""
        try:
            num1, num2 = Decimal(str(num1)), Decimal(str(num2))
            
            operations = {
                '+': lambda x, y: x + y,
                '-': lambda x, y: x - y,
                '*': lambda x, y: x * y,
                '/': lambda x, y: x / y if y != 0 else None,
                '^': lambda x, y: x ** y,
                '%': lambda x, y: x % y if y != 0 else None
            }
            
            if operation in operations:
                result = operations[operation](num1, num2)
                return float(result) if result is not None else None
            return None
        except:
            return None
    
    def scientific_operation(self, num, operation):
        """Perform scientific operations"""
        try:
            num = float(num)
            
            operations = {
                'sin': lambda x: math.sin(math.radians(x)),
                'cos': lambda x: math.cos(math.radians(x)),
                'tan': lambda x: math.tan(math.radians(x)),
                'asin': lambda x: math.degrees(math.asin(x)) if -1 <= x <= 1 else None,
                'acos': lambda x: math.degrees(math.acos(x)) if -1 <= x <= 1 else None,
                'atan': lambda x: math.degrees(math.atan(x)),
                'sinh': lambda x: math.sinh(x),
                'cosh': lambda x: math.cosh(x),
                'tanh': lambda x: math.tanh(x),
                'log': lambda x: math.log10(x) if x > 0 else None,
                'ln': lambda x: math.log(x) if x > 0 else None,
                'sqrt': lambda x: math.sqrt(x) if x >= 0 else None,
                'cbrt': lambda x: x ** (1/3),
                'exp': lambda x: math.exp(x),
                'abs': lambda x: abs(x),
                'factorial': lambda x: math.factorial(int(x)) if x >= 0 and x == int(x) else None,
                'reciprocal': lambda x: 1/x if x != 0 else None,
                'square': lambda x: x ** 2,
                'cube': lambda x: x ** 3
            }
            
            if operation in operations:
                result = operations[operation](num)
                return result
            return None
        except:
            return None
    
    def evaluate_expression(self, expression):
        """Evaluate complex mathematical expressions"""
        try:
            # Replace common mathematical functions and constants
            expression = expression.replace('π', str(math.pi))
            expression = expression.replace('e', str(math.e))
            expression = expression.replace('^', '**')
            
            # Add numpy functions for advanced calculations
            safe_dict = {
                '__builtins__': {},
                'sin': np.sin,
                'cos': np.cos,
                'tan': np.tan,
                'asin': np.arcsin,
                'acos': np.arccos,
                'atan': np.arctan,
                'sinh': np.sinh,
                'cosh': np.cosh,
                'tanh': np.tanh,
                'log': np.log10,
                'ln': np.log,
                'sqrt': np.sqrt,
                'exp': np.exp,
                'abs': abs,
                'pi': math.pi,
                'e': math.e,
                'factorial': math.factorial,
                'radians': np.radians,
                'degrees': np.degrees
            }
            
            result = eval(expression, safe_dict)
            return float(result) if not np.isnan(result) and np.isfinite(result) else None
        except:
            return None
    
    def add_to_history(self, expression, result):
        """Add calculation to history"""
        self.history.append({'expression': expression, 'result': result})
        if len(self.history) > 50:  # Keep only last 50 calculations
            self.history.pop(0)

calculator = ScientificCalculator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.json
    operation_type = data.get('type')
    if operation_type == 'basic':
        num1 = data.get('num1')
        num2 = data.get('num2')
        operation = data.get('operation')
        result = calculator.basic_operation(num1, num2, operation)
        if result is not None:
            expression = f"{num1} {operation} {num2}"
            calculator.add_to_history(expression, result)
            return jsonify({'success': True, 'result': result})
        else:
            return jsonify({'success': False, 'error': 'Invalid operation or division by zero'})
    
    elif operation_type == 'scientific':
        num = data.get('num')
        operation = data.get('operation')
        
        result = calculator.scientific_operation(num, operation)
        if result is not None:
            expression = f"{operation}({num})"
            calculator.add_to_history(expression, result)
            return jsonify({'success': True, 'result': result})
        else:
            return jsonify({'success': False, 'error': 'Invalid operation or domain error'})
    
    elif operation_type == 'expression':
        expression = data.get('expression')
        
        result = calculator.evaluate_expression(expression)
        if result is not None:
            calculator.add_to_history(expression, result)
            return jsonify({'success': True, 'result': result})
        else:
            return jsonify({'success': False, 'error': 'Invalid expression'})
    
    return jsonify({'success': False, 'error': 'Unknown operation type'})

@app.route('/memory', methods=['POST'])
def memory_operations():
    data = request.json
    operation = data.get('operation')
    
    if operation == 'store':
        value = data.get('value', 0)
        calculator.memory = float(value)
        return jsonify({'success': True, 'memory': calculator.memory})
    
    elif operation == 'recall':
        return jsonify({'success': True, 'memory': calculator.memory})
    
    elif operation == 'clear':
        calculator.memory = 0
        return jsonify({'success': True, 'memory': calculator.memory})
    
    elif operation == 'add':
        value = data.get('value', 0)
        calculator.memory += float(value)
        return jsonify({'success': True, 'memory': calculator.memory})
    
    return jsonify({'success': False, 'error': 'Invalid memory operation'})

@app.route('/history')
def get_history():
    return jsonify({'history': calculator.history})

@app.route('/clear-history', methods=['POST'])
def clear_history():
    calculator.history = []
    return jsonify({'success': True})

@app.route('/constants')
def get_constants():
    constants = {
        'π': math.pi,
        'e': math.e,
        'φ': (1 + math.sqrt(5)) / 2,  # Golden ratio
        'γ': 0.5772156649015329,      # Euler-Mascheroni constant
        'c': 299792458,               # Speed of light (m/s)
        'g': 9.80665                  # Standard gravity (m/s²)
    }
    return jsonify({'constants': constants})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)