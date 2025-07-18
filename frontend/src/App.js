import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

function App() {
  const [file, setFile] = useState(null);
  const [arquivos, setArquivos] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [selected, setSelected] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [dadosCsv, setDadosCsv] = useState(null);
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [mostrarDados, setMostrarDados] = useState({});
  const [mostrarRelatorio, setMostrarRelatorio] = useState({});
  const [progresso, setProgresso] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);

  const carregarDados = () => {
    axios.get('/api/arquivos/').then(res => setArquivos(res.data.arquivos));
    axios.get('/api/relatorios/').then(res => setRelatorios(res.data.relatorios));
  };

  useEffect(() => {
    carregarDados();
  }, [msg]);

  const iniciarProgresso = (nomeArquivo) => {
    setProgresso(prev => ({ ...prev, [nomeArquivo]: 0 }));
    
    const interval = setInterval(() => {
      setProgresso(prev => {
        const novoProgresso = prev[nomeArquivo] + Math.random() * 15;
        if (novoProgresso >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            carregarDados();
            setProgresso(prev => ({ ...prev, [nomeArquivo]: 100 }));
          }, 500);
          return { ...prev, [nomeArquivo]: 100 };
        }
        return { ...prev, [nomeArquivo]: novoProgresso };
      });
    }, 500);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setShowConfirm(true);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setMsg('Enviando...');
    setShowConfirm(false);
    try {
      await axios.post('/api/upload/', formData);
      setMsg('Arquivo enviado! Processando...');
      iniciarProgresso(file.name);
      setTimeout(carregarDados, 2000);
      setFile(null);
    } catch {
      setMsg('Erro ao enviar arquivo.');
    }
  };

  const handleDownload = async (nome) => {
    setDownloadUrl(`/api/relatorio/${nome}`);
    setSelected(nome);
  };

  const handleDelete = async (nome) => {
    if (window.confirm(`Tem certeza que deseja deletar o arquivo "${nome}"?`)) {
      try {
        await axios.delete(`/api/arquivo/${nome}`);
        setMsg('Arquivo deletado com sucesso!');
        setProgresso(prev => {
          const novo = { ...prev };
          delete novo[nome];
          return novo;
        });
        carregarDados();
      } catch (error) {
        setMsg('Erro ao deletar arquivo.');
      }
    }
  };

  const handleVisualizarDados = async (nome) => {
    if (mostrarDados[nome]) {
      setMostrarDados(prev => ({ ...prev, [nome]: false }));
      return;
    }
    
    try {
      const response = await axios.get(`/api/dados/${nome.replace('.csv', '')}`);
      setDadosCsv(response.data.dados);
      setMostrarDados(prev => ({ ...prev, [nome]: true }));
      setMostrarRelatorio(prev => ({ ...prev, [nome]: false }));
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleVisualizarRelatorio = async (nome) => {
    if (mostrarRelatorio[nome]) {
      setMostrarRelatorio(prev => ({ ...prev, [nome]: false }));
      return;
    }
    
    try {
      const response = await axios.get(`/api/relatorio-dados/${nome}`);
      setDadosRelatorio(response.data.dados);
      setMostrarRelatorio(prev => ({ ...prev, [nome]: true }));
      setMostrarDados(prev => ({ ...prev, [nome]: false }));
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    }
  };

  const verificarRelatorio = (nomeArquivo) => {
    const nomeRelatorio = nomeArquivo.replace('.csv', '');
    return relatorios.includes(nomeRelatorio);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      padding: '20px',
      fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: 1200,
        width: '100%',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 12,
        padding: 30,
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
        flex: 1
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 40,
          paddingBottom: 20,
          borderBottom: '2px solid #e8eaed'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            marginBottom: 10,
            letterSpacing: '-0.02em'
          }}>
            Analisador de Vendas AWS
          </h1>
          <p style={{ color: '#5f6368', fontSize: '1.1rem', margin: 0, fontWeight: '400' }}>
            Upload, processamento e análise automática de dados de vendas
          </p>
        </div>

        {/* Upload Section */}
        <div style={{
          background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
          borderRadius: 12,
          padding: 25,
          marginBottom: 30,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '1.3rem', fontWeight: '600' }}>
            Upload de Arquivo CSV
          </h3>
          
          {!showConfirm ? (
            <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileSelect}
                style={{
                  flex: 1,
                  padding: '12px 15px',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.95)',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              />
              <div style={{
                padding: '12px 25px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'not-allowed'
              }}>
                Selecione um arquivo
              </div>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: 20,
              marginBottom: 15
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  color: 'white'
                }}>
                  CSV
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: '600', fontSize: '1.1rem' }}>
                    {file.name}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                    {formatFileSize(file.size)} • CSV
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                <button 
                  onClick={handleUpload}
                  style={{
                    padding: '12px 30px',
                    border: 'none',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                  }}
                >
                  Confirmar e Enviar
                </button>
                <button 
                  onClick={() => {
                    setFile(null);
                    setShowConfirm(false);
                  }}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
          
          {msg && (
            <div style={{
              marginTop: 15,
              padding: '10px 15px',
              borderRadius: 6,
              background: msg.includes('Erro') ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)',
              color: msg.includes('Erro') ? '#c0392b' : '#27ae60',
              fontWeight: '600',
              border: `1px solid ${msg.includes('Erro') ? '#e74c3c' : '#2ecc71'}`
            }}>
              {msg}
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div className="main-content" style={{ display: 'flex', gap: 30 }}>
          {/* Seção de Arquivos Enviados */}
          <div style={{ flex: 1 }}>
            <div style={{
              background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10, fontWeight: '600' }}>
                Arquivos Enviados
                <span style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: '400' }}>({arquivos.length})</span>
              </h3>
            </div>
            
            {arquivos.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 40,
                color: '#5f6368',
                background: '#f8f9fa',
                borderRadius: 12,
                border: '2px dashed #dadce0'
              }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  background: '#e8eaed', 
                  borderRadius: 12,
                  margin: '0 auto 15px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  color: '#5f6368'
                }}>
                  CSV
                </div>
                <p style={{ fontWeight: '500', margin: '0 0 5px 0' }}>Nenhum arquivo enviado ainda.</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0 }}>Faça upload de um arquivo CSV para começar</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {arquivos.map(nome => (
                  <div key={nome} style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e8eaed',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        background: '#f1f3f4', 
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        color: '#5f6368',
                        fontWeight: '600'
                      }}>
                        CSV
                      </div>
                      <strong style={{ fontSize: '1.1rem', color: '#202124', fontWeight: '600' }}>{nome}</strong>
                    </div>
                    
                    {/* Barra de Progresso */}
                    {progresso[nome] !== undefined && progresso[nome] < 100 && (
                      <div style={{ marginBottom: 15 }}>
                        <div style={{ 
                          width: '100%', 
                          backgroundColor: '#f1f3f4', 
                          borderRadius: 6, 
                          height: 8,
                          overflow: 'hidden',
                          boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            width: `${progresso[nome]}%`,
                            background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
                            height: '100%',
                            transition: 'width 0.3s ease',
                            borderRadius: 6
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                          <small style={{ color: '#5f6368', fontWeight: '500' }}>
                            {progresso[nome] < 100 ? 'Processando...' : 'Concluído!'}
                          </small>
                          <small style={{ color: '#5f6368', fontWeight: '500' }}>
                            {Math.round(progresso[nome])}%
                          </small>
                        </div>
                      </div>
                    )}

                    {/* Status do Relatório */}
                    {progresso[nome] === 100 && verificarRelatorio(nome) && (
                      <div style={{
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        color: 'white',
                        padding: '8px 15px',
                        borderRadius: 6,
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        textAlign: 'center',
                        marginBottom: 15
                      }}>
                        Relatório pronto!
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleVisualizarDados(nome)}
                        style={{
                          padding: '8px 15px',
                          border: 'none',
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {mostrarDados[nome] ? 'Ocultar' : 'Ver Dados'}
                      </button>
                      <button 
                        onClick={() => handleDelete(nome)}
                        style={{
                          padding: '8px 15px',
                          border: 'none',
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção de Relatórios Gerados */}
          <div style={{ flex: 1 }}>
            <div style={{
              background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <h3 style={{ color: 'white', margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10, fontWeight: '600' }}>
                Relatórios Gerados
                <span style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: '400' }}>({relatorios.length})</span>
              </h3>
            </div>
            
            {relatorios.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 40,
                color: '#5f6368',
                background: '#f8f9fa',
                borderRadius: 12,
                border: '2px dashed #dadce0'
              }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  background: '#e8eaed', 
                  borderRadius: 12,
                  margin: '0 auto 15px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  color: '#5f6368'
                }}>
                  RPT
                </div>
                <p style={{ fontWeight: '500', margin: '0 0 5px 0' }}>Nenhum relatório gerado ainda.</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.7, margin: 0 }}>Os relatórios aparecerão aqui após o processamento</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {relatorios.map(nome => (
                  <div key={nome} style={{
                    background: 'white',
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    border: '1px solid #e8eaed',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        background: '#f1f3f4', 
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        color: '#5f6368',
                        fontWeight: '600'
                      }}>
                        RPT
                      </div>
                      <strong style={{ fontSize: '1.1rem', color: '#202124', fontWeight: '600' }}>{nome}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => handleDownload(nome)}
                        style={{
                          padding: '8px 15px',
                          border: 'none',
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        Baixar
                      </button>
                      <button 
                        onClick={() => handleVisualizarRelatorio(nome)}
                        style={{
                          padding: '8px 15px',
                          border: 'none',
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        {mostrarRelatorio[nome] ? 'Ocultar' : 'Ver Relatório'}
                      </button>
                      {selected === nome && downloadUrl && (
                        <a 
                          href={downloadUrl} 
                          download
                          style={{
                            padding: '8px 15px',
                            border: 'none',
                            borderRadius: 6,
                            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            textDecoration: 'none',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabelas de Dados */}
        {dadosCsv && arquivos.map(nome => (
          mostrarDados[nome] && (
            <div key={`dados-${nome}`} style={{ marginTop: 30 }}>
              <div style={{
                background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20
              }}>
                <h4 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                  Dados do arquivo: {nome}
                </h4>
              </div>
              <div style={{ 
                overflowX: 'auto',
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e8eaed'
              }}>
                <table style={{ 
                  borderCollapse: 'collapse', 
                  width: '100%',
                  borderRadius: 12,
                  overflow: 'hidden'
                }}>
                  <thead>
                    <tr>
                      {Object.keys(dadosCsv[0] || {}).map(coluna => (
                        <th key={coluna} style={{ 
                          border: 'none',
                          padding: 15,
                          background: 'linear-gradient(135deg, #34495e 0%, #2c3e50 100%)',
                          color: 'white',
                          fontWeight: '600',
                          textAlign: 'left',
                          fontSize: '1rem'
                        }}>
                          {coluna}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosCsv.map((linha, index) => (
                      <tr key={index} style={{
                        background: index % 2 === 0 ? '#f8f9fa' : 'white',
                        transition: 'background 0.3s ease'
                      }}>
                        {Object.values(linha).map((valor, colIndex) => (
                          <td key={colIndex} style={{ 
                            border: 'none',
                            padding: 15,
                            fontSize: '0.95rem',
                            color: '#202124'
                          }}>
                            {valor}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ))}

        {dadosRelatorio && relatorios.map(nome => (
          mostrarRelatorio[nome] && (
            <div key={`relatorio-${nome}`} style={{ marginTop: 30 }}>
              <div style={{
                background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20
              }}>
                <h4 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                  Relatório processado: {nome}
                </h4>
              </div>
              <div style={{ 
                overflowX: 'auto',
                background: 'white',
                borderRadius: 12,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                border: '1px solid #e8eaed'
              }}>
                <table style={{ 
                  borderCollapse: 'collapse', 
                  width: '100%',
                  borderRadius: 12,
                  overflow: 'hidden'
                }}>
                  <thead>
                    <tr>
                      {Object.keys(dadosRelatorio[0] || {}).map(coluna => (
                        <th key={coluna} style={{ 
                          border: 'none',
                          padding: 15,
                          background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)',
                          color: 'white',
                          fontWeight: '600',
                          textAlign: 'left',
                          fontSize: '1rem'
                        }}>
                          {coluna}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosRelatorio.map((linha, index) => (
                      <tr key={index} style={{
                        background: index % 2 === 0 ? '#f8f9fa' : 'white',
                        transition: 'background 0.3s ease'
                      }}>
                        {Object.values(linha).map((valor, colIndex) => (
                          <td key={colIndex} style={{ 
                            border: 'none',
                            padding: 15,
                            fontSize: '0.95rem',
                            color: '#202124',
                            fontWeight: colIndex === 0 ? '600' : '400'
                          }}>
                            {valor}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Footer */}
      <div className="footer" style={{
        textAlign: 'center',
        marginTop: 30,
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <p style={{
          color: 'white',
          margin: 0,
          fontSize: '1rem',
          fontWeight: '600',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          Feito por Gabriel Alcantara
        </p>
      </div>
    </div>
  );
}

export default App; 