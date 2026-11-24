import re
from flask import abort

def symbol(value):
    value = value.upper().strip() if isinstance(value, str) else ''
    if not re.fullmatch(r'\^?[A-Z0-9][A-Z0-9.=-]{0,19}', value):
        abort(400, description='Enter a valid ticker, such as AAPL or RELIANCE.NS.')
    return value
