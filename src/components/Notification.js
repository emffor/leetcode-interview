import React, { useEffect } from 'react';
import './Notification.css';

/**
 * Componente de notificação
 * @param {Object} props Propriedades do componente
 * @param {boolean} props.show Exibir ou não a notificação
 * @param {string} props.message Mensagem da notificação
 * @param {string} props.type Tipo de notificação: 'success', 'error', 'warning', 'info'
 * @param {Function} props.onClose Função para fechar a notificação
 */
const Notification = ({ show, message, type = 'info', onClose }) => {
  // Fecha automaticamente após 5 segundos
  useEffect(() => {
    if (show) {
      const timeout = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [show, onClose]);
  
  if (!show) return null;
  
  return (
    <div className={`notification notification-${type}`}>
      <div className="notification-content">
        {message}
      </div>
      <button className="notification-close" onClick={onClose}>
        ✕
      </button>
    </div>
  );
};

export default Notification;