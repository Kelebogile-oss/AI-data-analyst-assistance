from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import speech_recognition as sr
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
import io

app = Flask(__name__)
CORS(app)

data_store = {}

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    df = pd.read_csv(file)
    session_id = '12345'
    data_store[session_id] = df
    return jsonify({"message": "File uploaded", "columns": list(df.columns)})

@app.route('/voice-command', methods=['POST'])
def voice_command():
    recognizer = sr.Recognizer()
    audio_file = request.files['audio']
    with sr.AudioFile(audio_file) as source:
        audio = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio)
            return jsonify({"transcription": text})
        except sr.UnknownValueError:
            return jsonify({"error": "Could not understand"}), 400

@app.route('/clean-data', methods=['GET'])
def clean_data():
    session_id = '12345'
    df = data_store.get(session_id)
    if df is None:
        return jsonify({"error": "No data found"})
    df_cleaned = df.dropna()
    data_store[session_id] = df_cleaned
    return jsonify({
        "message": "Data cleaned",
        "rows_before": len(df),
        "rows_after": len(df_cleaned)
    })

@app.route('/analyze', methods=['GET'])
def analyze():
    session_id = '12345'
    df = data_store.get(session_id)
    if df is None:
        return jsonify({"error": "No data"})
    stats = df.describe().to_dict()
    return jsonify({"summary": stats})

@app.route('/predict', methods=['POST'])
def predict():
    session_id = '12345'
    df = data_store.get(session_id)
    target = request.json.get("target")

    if df is None or target not in df.columns:
        return jsonify({"error": "Invalid target"}), 400

    X = df.drop(columns=[target])
    y = df[target]
    X = pd.get_dummies(X)

    model = LinearRegression()
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    model.fit(X_train, y_train)
    score = model.score(X_test, y_test)

    return jsonify({"model_score": round(score, 2)})

if __name__ == '__main__':
    app.run(debug=True)
