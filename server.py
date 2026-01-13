from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import os
from datetime import datetime
import uuid
from functools import wraps

app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")

# File paths
USERS_FILE = 'data/users.json'
BANS_FILE = 'data/bans.json'
CHATS_FILE = 'data/chats.json'
APPEALS_FILE = 'data/appeals.json'
REPORTS_FILE = 'data/reports.json'

# Initialize data files
def init_data_files():
    os.makedirs('data', exist_ok=True)
    
    default_data = {
        'users': {},
        'bans': {},
        'chats': {},
        'appeals': [],
        'reports': []
    }
    
    for file_path, default in [
        (USERS_FILE, {'users': {}}),
        (BANS_FILE, {'bans': {}}),
        (CHATS_FILE, {'chats': {}}),
        (APPEALS_FILE, {'appeals': []}),
        (REPORTS_FILE, {'reports': []})
    ]:
        if not os.path.exists(file_path):
            with open(file_path, 'w') as f:
                json.dump(default, f, indent=2)

# Authentication decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'No authorization header'}), 401
        
        token = auth_header.replace('Bearer ', '')
        
        # Check if admin token
        if token.startswith('admin_token_'):
            return f(*args, **kwargs)
        
        return jsonify({'error': 'Admin access required'}), 403
    return decorated_function

@app.route('/api/check-username', methods=['POST'])
def check_username():
    data = request.json
    username = data.get('username', '').lower().strip()
    
    if not username:
        return jsonify({'available': False, 'error': 'Username required'})
    
    # Load existing users
    try:
        with open(USERS_FILE, 'r') as f:
            users_data = json.load(f)
    except:
        users_data = {'users': {}}
    
    # Check if username exists
    if username in users_data['users']:
        return jsonify({'available': False, 'error': 'Username taken'})
    
    return jsonify({'available': True})

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    roblox_id = data.get('robloxId')
    username = data.get('username', '').lower().strip()
    avatar = data.get('avatar')
    
    if not all([roblox_id, username]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check for bad words
    bad_words = ['badword1', 'badword2', 'badword3']
    if any(bad in username.lower() for bad in bad_words):
        return jsonify({'error': 'Inappropriate username'}), 400
    
    # Load existing users
    try:
        with open(USERS_FILE, 'r') as f:
            users_data = json.load(f)
    except:
        users_data = {'users': {}}
    
    # Check if username exists
    if username in users_data['users']:
        return jsonify({'error': 'Username already exists'}), 400
    
    # Create user
    user_id = str(uuid.uuid4())
    user_data = {
        'id': user_id,
        'robloxId': roblox_id,
        'username': username,
        'displayName': data.get('username'),  # Original casing
        'avatar': avatar,
        'isAdmin': roblox_id == 'S1xsGG',
        'createdAt': datetime.now().isoformat(),
        'lastLogin': datetime.now().isoformat(),
        'ip': request.remote_addr
    }
    
    users_data['users'][username] = user_data
    
    # Save to file
    with open(USERS_FILE, 'w') as f:
        json.dump(users_data, f, indent=2)
    
    # Generate token
    token = f"{'admin' if roblox_id == 'S1xsGG' else 'user'}_token_{user_id}"
    
    return jsonify({
        'success': True,
        'token': token,
        'user': {
            'username': username,
            'displayName': data.get('username'),
            'avatar': avatar,
            'isAdmin': roblox_id == 'S1xsGG'
        }
    })

@app.route('/api/ban', methods=['POST'])
@admin_required
def ban_user():
    data = request.json
    username = data.get('username', '').lower().strip()
    reason = data.get('reason', 'No reason provided')
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    # Load bans
    try:
        with open(BANS_FILE, 'r') as f:
            bans_data = json.load(f)
    except:
        bans_data = {'bans': {}}
    
    # Check if already banned
    if username in bans_data['bans']:
        return jsonify({'error': 'User already banned'}), 400
    
    # Get user IP
    try:
        with open(USERS_FILE, 'r') as f:
            users_data = json.load(f)
        user_ip = users_data['users'].get(username, {}).get('ip', 'unknown')
    except:
        user_ip = 'unknown'
    
    # Create ban record
    ban_record = {
        'username': username,
        'reason': reason,
        'bannedBy': data.get('admin', 'Admin'),
        'bannedAt': datetime.now().isoformat(),
        'ip': user_ip,
        'active': True
    }
    
    bans_data['bans'][username] = ban_record
    
    # Save bans
    with open(BANS_FILE, 'w') as f:
        json.dump(bans_data, f, indent=2)
    
    # Remove user from active users
    try:
        with open(USERS_FILE, 'r') as f:
            users_data = json.load(f)
        if username in users_data['users']:
            del users_data['users'][username]
            with open(USERS_FILE, 'w') as f:
                json.dump(users_data, f, indent=2)
    except:
        pass
    
    return jsonify({'success': True, 'message': f'Banned {username}'})

@app.route('/api/unban', methods=['POST'])
@admin_required
def unban_user():
    data = request.json
    username = data.get('username', '').lower().strip()
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    # Load bans
    try:
        with open(BANS_FILE, 'r') as f:
            bans_data = json.load(f)
    except:
        bans_data = {'bans': {}}
    
    # Check if banned
    if username not in bans_data['bans']:
        return jsonify({'error': 'User not banned'}), 400
    
    # Remove ban
    del bans_data['bans'][username]
    
    # Save updated bans
    with open(BANS_FILE, 'w') as f:
        json.dump(bans_data, f, indent=2)
    
    return jsonify({'success': True, 'message': f'Unbanned {username}'})

@app.route('/api/check-ban/<username>', methods=['GET'])
def check_ban(username):
    username = username.lower().strip()
    
    # Load bans
    try:
        with open(BANS_FILE, 'r') as f:
            bans_data = json.load(f)
    except:
        bans_data = {'bans': {}}
    
    is_banned = username in bans_data['bans']
    
