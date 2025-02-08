import logging
import os
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logging():
    log_dir = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'MultiChat', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_filename = os.path.join(log_dir, f'add_{datetime.now().strftime("%m%d_%H%M%S")}.log')
    
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            RotatingFileHandler(
                log_filename, 
                maxBytes=1024 * 1024,  # 1MB
                backupCount=3
            )
        ]
    )

    return logging.getLogger(__name__)
