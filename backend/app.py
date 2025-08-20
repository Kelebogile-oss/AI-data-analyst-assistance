from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import speech_recognition as sr
import io
import time
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import numpy as np
import google.generativeai as genai
import json

app = Flask(__name__)
CORS(app)

data_store = {}
gemini_api_key = ''
if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    
chat_cache = {}

def get_gemini_response(prompt, data):
    try:
        model = genai.GenerativeModel('gemini-2.5-flash-preview-05-20')
        combined_prompt = f"Given the following data summary and the user's request, provide a concise, insightful response. Do not act as a chatbot. Just give the analysis.\n\nData Summary: {data}\n\nUser Request: {prompt}"
        response = model.generate_content(combined_prompt)
        return response.text
    except Exception as e:
        return f"An error occurred: {str(e)}"

@app.route('/upload', methods=['POST'])
def upload():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
            
        file = request.files['file']

        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        session_id = '12345'
        
        df = pd.read_csv(file)
        
        data_store[session_id] = df
        
        return jsonify({"message": "File uploaded", "columns": list(df.columns)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/summary', methods=['GET'])
def summary():
    """
    Returns a basic summary of the uploaded DataFrame.
    """
    session_id = '12345'
    df = data_store.get(session_id)
    if df is None:
        return jsonify({"error": "No data"}), 404

    stats = df.describe(include='all').to_dict()
    summary_data = {}
    for column, values in stats.items():
        summary_data[column] = {
            k: v if not isinstance(v, (np.integer, np.floating)) else float(v)
            for k, v in values.items()
        }
    return jsonify({"summary": summary_data}), 200

@app.route('/predict', methods=['POST'])
def predict():
    session_id = '12345'
    df = data_store.get(session_id)
    if df is None:
        return jsonify({"error": "No data"}), 404

    target = request.json.get("target")

    if target not in df.columns:
        return jsonify({"error": f"Invalid target column: {target}"}), 400

    try:
        X = df.drop(columns=[target])
        y = df[target]
        
        X = pd.get_dummies(X)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = LinearRegression()
        model.fit(X_train, y_train)
        
        score = model.score(X_test, y_test)

        return jsonify({"model_score": round(score, 2)}), 200

    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    prompt = data.get('prompt')
    data_summary = data.get('data_summary')

    if not prompt or not data_summary:
        return jsonify({"error": "Prompt or data summary missing"}), 400

    try:
        response_text = get_gemini_response(prompt, data_summary)
        return jsonify({"response": response_text}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/voice-command', methods=['POST'])
def voice_command():
    recognizer = sr.Recognizer()
    audio_file = request.files.get('audio')

    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400

    try:
        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            return jsonify({"text": text}), 200
    except sr.UnknownValueError:
        return jsonify({"error": "Could not understand audio"}), 400
    except sr.RequestError as e:
        return jsonify({"error": f"Could not request results; {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)