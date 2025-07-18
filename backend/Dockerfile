FROM python:3.11-slim
WORKDIR /app
COPY main.py .
RUN pip install --upgrade pip
RUN pip install fastapi uvicorn boto3 python-multipart
EXPOSE 80
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]