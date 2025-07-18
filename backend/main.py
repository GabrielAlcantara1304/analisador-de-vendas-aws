from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import boto3
import os
import csv
import tempfile
from botocore.exceptions import ClientError

app = FastAPI()

BUCKET_NAME = os.environ.get("BUCKET_NAME", "gabriel-datalake-vendas")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
s3 = boto3.client("s3", region_name=AWS_REGION)

@app.post("/upload/")
def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Apenas arquivos CSV são permitidos.")
    key = f"raw/{file.filename}"
    s3.upload_fileobj(file.file, BUCKET_NAME, key)
    return {"message": f"Arquivo {file.filename} enviado para processamento."}

@app.get("/relatorio/{nome}")
def get_relatorio(nome: str):
    key = f"relatorios/{nome}_relatorio.csv"
    try:
        tmp_path = f"/tmp/{nome}_relatorio.csv"
        s3.download_file(BUCKET_NAME, key, tmp_path)
        return FileResponse(tmp_path, media_type="text/csv", filename=f"{nome}_relatorio.csv")
    except ClientError:
        raise HTTPException(status_code=404, detail="Relatório não encontrado.")

@app.get("/relatorios/")
def list_relatorios():
    try:
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix="relatorios/")
        arquivos = [obj['Key'].replace('relatorios/', '').replace('_relatorio.csv', '') for obj in response.get('Contents', []) if obj['Key'].endswith('_relatorio.csv')]
        return JSONResponse(content={"relatorios": arquivos})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/arquivos/")
def list_arquivos():
    try:
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix="raw/")
        arquivos = [obj['Key'].replace('raw/', '') for obj in response.get('Contents', []) if obj['Key'].endswith('.csv')]
        return JSONResponse(content={"arquivos": arquivos})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/arquivo/{nome}")
def delete_arquivo(nome: str):
    try:
        # Deleta o arquivo original
        s3.delete_object(Bucket=BUCKET_NAME, Key=f"raw/{nome}")
        
        # Deleta o relatório correspondente se existir
        try:
            s3.delete_object(Bucket=BUCKET_NAME, Key=f"relatorios/{nome.replace('.csv', '')}_relatorio.csv")
        except:
            pass  # Relatório pode não existir
        
        return {"message": f"Arquivo {nome} deletado com sucesso."}
    except ClientError:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dados/{nome}")
def get_dados_csv(nome: str):
    key = f"raw/{nome}.csv"
    try:
        with tempfile.NamedTemporaryFile() as tmp:
            s3.download_file(BUCKET_NAME, key, tmp.name)
            dados = []
            with open(tmp.name, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    dados.append(row)
        return JSONResponse(content={"dados": dados})
    except ClientError:
        raise HTTPException(status_code=404, detail="Arquivo CSV não encontrado.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/relatorio-dados/{nome}")
def get_relatorio_dados(nome: str):
    key = f"relatorios/{nome}_relatorio.csv"
    try:
        with tempfile.NamedTemporaryFile() as tmp:
            s3.download_file(BUCKET_NAME, key, tmp.name)
            dados = []
            with open(tmp.name, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    dados.append(row)
        return JSONResponse(content={"dados": dados})
    except ClientError:
        raise HTTPException(status_code=404, detail="Relatório não encontrado.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 