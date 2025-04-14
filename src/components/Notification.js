import React, { useEffect, useState } from 'react';
import './Notification.css';

/**
 * Componente de notificação melhorado
 * Suporta múltiplas notificações, prioridades e acessibilidade
 * 
 * @param {Object} props Propriedades do componente
 * @param {boolean} props.show Exibir ou não a notificação
 * @param {string} props.message Mensagem da notificação
 * @param {string} props.type Tipo de notificação: 'success', 'error', 'warning', 'info'
 * @param {Function} props.onClose Função para fechar a notificação
 * @param {number} props.duration Duração em milissegundos (0 para não fechar automaticamente)
 * @param {number} props.priority Prioridade da notificação (maior = mais importante)
 */
const Notification = ({ 
  show, 
  message, 
  type = 'info', 
  onClose, 
  duration = 5000,
  priority = 1
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  
  // Define as propriedades de acessibilidade baseadas no tipo
  const getAriaProps = () => {
    switch (type) {
      case 'error':
        return { 
          role: 'alert',
          'aria-live': 'assertive'
        };
      case 'warning':
        return { 
          role: 'status',
          'aria-live': 'polite'
        };
      default:
        return { 
          role: 'status',
          'aria-live': 'polite'
        };
    }
  };
  
  // Gerencia a contagem regressiva para fechamento automático
  useEffect(() => {
    // Se não deve mostrar ou duração é 0, não configurar timer
    if (!show || duration === 0) return;
    
    let timer;
    if (!isPaused && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          // Decrementa em intervalos de 100ms para animação suave
          const newValue = prev - 100;
          if (newValue <= 0) {
            // Inicia animação de saída
            setIsExiting(true);
            clearInterval(timer);
            
            // Após a animação de saída terminar, fecha a notificação
            setTimeout(() => {
              onClose();
              // Reseta os estados
              setIsExiting(false);
              setTimeLeft(duration);
            }, 300); // Tempo da animação de saída
            
            return 0;
          }
          return newValue;
        });
      }, 100);
    }
    
    return () => clearInterval(timer);
  }, [show, isPaused, timeLeft, duration, onClose]);
  
  // Reseta o timer quando a mensagem muda
  useEffect(() => {
    if (show) {
      setTimeLeft(duration);
      setIsExiting(false);
    }
  }, [message, show, duration]);
  
  // Se não deve mostrar, não renderiza
  if (!show) return null;
  
  // Calcula a porcentagem de progresso para a barra
  const progressPercent = (timeLeft / duration) * 100;
  
  // Ícones para os diferentes tipos de notificação
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
          </svg>
        );
      case 'error':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
          </svg>
        );
      case 'warning':
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
          </svg>
        );
    }
  };
  
  return (
    <div 
      className={`notification notification-${type} ${isExiting ? 'exiting' : ''}`}
      style={{ zIndex: 1000 + priority }} // Prioridade afeta z-index
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      {...getAriaProps()}
    >
      <div className="notification-icon">
        {getIcon()}
      </div>
      
      <div className="notification-content">
        {message}
      </div>
      
      <button 
        className="notification-close" 
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => {
            onClose();
            setIsExiting(false);
          }, 300);
        }}
        aria-label="Fechar notificação"
      >
        ✕
      </button>
      
      {/* Barra de progresso para mostrar quanto tempo resta */}
      {duration > 0 && (
        <div className="notification-progress-container">
          <div 
            className="notification-progress" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Componente gerenciador de múltiplas notificações
 */
export const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);
  
  /**
   * Adiciona uma nova notificação
   * @param {Object} notification Dados da notificação
   */
  const addNotification = (notification) => {
    const id = Date.now(); // ID único baseado no timestamp
    
    setNotifications(prev => [
      ...prev,
      {
        id,
        ...notification,
        show: true
      }
    ]);
    
    return id;
  };
  
  /**
   * Remove uma notificação pelo ID
   * @param {number} id ID da notificação
   */
  const removeNotification = (id) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== id)
    );
  };
  
  // Exporta os métodos para uso externo via Context API
  // (Implemente um NotificationContext se quiser usar isso)
  
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default Notification;