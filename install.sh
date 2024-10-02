#!/bin/bash
sudo apt-get install -y whiptail

# Caminhos
PROJECT_DIR="./"
DEST_DIR="/mnt/core"

# Função para capturar erros
error_handling() {
  echo "Ocorreu um erro no script."
  exit 1
}

# Definir o trap para capturar qualquer erro
trap error_handling ERR


# Função para coletar número de servidores usando whiptail
prompt_info_num_servidores() {
  NUM_SERVIDORES=$(whiptail --inputbox "Informe o número de servidores da aplicação:" 8 39 --title "Número de Servidores" 3>&1 1>&2 2>&3)

  if [ -z "$NUM_SERVIDORES" ]; then
    whiptail --msgbox "Todos os campos são obrigatórios. Por favor, reinicie o script." 8 39 --title "Erro"
    prompt_info_num_servidores
  fi

  if [ "$NUM_SERVIDORES" -eq 1 ]; then
    install_localy
  elif [ "$NUM_SERVIDORES" -gt 1 ]; then
    # Escreve no arquivo .env
    echo "Escrevendo dados no arquivo .env..."
    echo "NUM_SERVIDORES=$NUM_SERVIDORES" >> $ENV_FILE
    prompt_info
  fi
}

# Função para coletar dados do administrador usando whiptail
prompt_info() {
  IP_VIRTUAL=$(whiptail --inputbox "Informe o IP virtual:" 8 39 --title "IP Virtual" 3>&1 1>&2 2>&3)
  USUARIO=$(whiptail --inputbox "Informe o usuário:" 8 39 --title "Usuário" 3>&1 1>&2 2>&3)
  SENHA=$(whiptail --passwordbox "Informe a senha:" 8 39 --title "Senha" 3>&1 1>&2 2>&3)

  if [ -z "$IP_VIRTUAL" ] || [ -z "$USUARIO" ] || [ -z "$SENHA" ]; then
    whiptail --msgbox "Todos os campos são obrigatórios. Por favor, reinicie o script." 8 39 --title "Erro"
    exit 1
  fi
}

install_localy() {
    echo "install_localy: Trabalhando aqui..."

    # Bloco try
    if install_apps; then
        echo "Script instalação Backend CORE bem-sucedido!"
        # Bloco try
        if install_front; then
            # Exibir mensagem de finalização
            whiptail --msgbox "Script finalizado com sucesso!" 8 39 --title "CORE Instalado"
        else
            # Bloco catch
            echo "Erro ao executar Frontend CORE, verifique os logs."
        fi
    else
        # Bloco catch
        echo "Erro ao executar script Backend CORE, verifique os logs."
    fi
    exit 0
}


# Função para instalar NVM, Node.js, PM2, NGINX, PostgreSQL e configurar NGINX
install_apps() {
    # Escreve no arquivo .env
    echo "Escrevendo dados no arquivo .env do backend..."
    ENV_FILE_BACK="./Backend/backend/src/.env"
    echo "NUM_SERVIDORES=$NUM_SERVIDORES" >> $ENV_FILE_BACK
    # Coletar o nome do servidor : core.wecom.com.br
    HOST=$(whiptail --inputbox "Informe o nome do servidor:" 8 39 --title "Nome do servidor" 3>&1 1>&2 2>&3)

    # Coletar os caminhos do certificado e da chave SSL
    SSL_CERT=$(whiptail --inputbox "Informe o caminho do certificado SSL (.pem):" 8 39 --title "Caminho Certificado SSL" 3>&1 1>&2 2>&3)
    SSL_KEY=$(whiptail --inputbox "Informe o caminho da chave SSL (.key):" 8 39 --title "Caminho Chave SSL" 3>&1 1>&2 2>&3)

    if [ -z "$SSL_CERT" ] || [ -z "$SSL_KEY" ]; then
        whiptail --msgbox "Os caminhos do certificado SSL e da chave SSL são obrigatórios." 8 39 --title "Erro"
        exit 1
    fi

    # Instalação do NVM
    whiptail --infobox "Instalando NVM..." 8 39
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # Instalação da versão mais recente do Node.js
    whiptail --infobox "Instalando a versão mais recente do Node.js..." 8 39
    nvm install node

    # Instalação do PM2
    whiptail --infobox "Instalando PM2..." 8 39
    npm install -g pm2

    # Instalação do NGINX
    whiptail --infobox "Instalando NGINX..." 8 39
    sudo apt-get update
    sudo apt-get install -y nginx

    # Configuração do arquivo nginx.conf
    whiptail --infobox "Configurando NGINX..." 8 39
    sudo bash -c "cat > /etc/nginx/nginx.conf <<EOF
        user www-data;
        worker_processes auto;
        pid /run/nginx.pid;
        include /etc/nginx/modules-enabled/*.conf;

        events {
            worker_connections 768;
        }

        stream {
            upstream mqtt_backend {
                least_conn;
                server 127.0.0.1:1883;
            }

            server {
                listen 1883;
                proxy_pass mqtt_backend;
                proxy_timeout 600s;
                proxy_connect_timeout 5s;
            }
        }

        http {
            client_max_body_size 500M;
            upstream nodejs_backend_4343 {
                least_conn;
                server 127.0.0.1:4343 max_fails=3 fail_timeout=30s;
            }

            upstream nodejs_backend_4444 {
                least_conn;
                server 127.0.0.1:4444 max_fails=3 fail_timeout=30s;
            }

            upstream nodejs_backend_10101 {
                least_conn;
                server 127.0.0.1:10101 max_fails=3 fail_timeout=30s;
            }

            server {
                listen 443 ssl;
                server_name $HOST;

                ssl_certificate $SSL_CERT;
                ssl_certificate_key $SSL_KEY;

                location /api {
                    proxy_pass https://nodejs_backend_4444;
                    proxy_http_version 1.1;
                    proxy_set_header Upgrade \$http_upgrade;
                    proxy_set_header Connection "Upgrade";
                    proxy_set_header Host \$host;
                    proxy_set_header X-Real-IP \$remote_addr;
                    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto \$scheme;
                }

                location /ws {
                    proxy_pass https://nodejs_backend_10101;
                    proxy_http_version 1.1;
                    proxy_set_header Upgrade \$http_upgrade;
                    proxy_set_header Connection "Upgrade";
                    proxy_set_header Host \$host;
                    proxy_set_header X-Real-IP \$remote_addr;
                    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto \$scheme;
                }

                location / {
                    proxy_pass https://nodejs_backend_4343;
                    proxy_http_version 1.1;
                    proxy_set_header Upgrade \$http_upgrade;
                    proxy_set_header Connection "Upgrade";
                    proxy_set_header Host \$host;
                    proxy_set_header X-Real-IP \$remote_addr;
                    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
                    proxy_set_header X-Forwarded-Proto \$scheme;
                }
            }
        }"

    # Reiniciar o NGINX
    whiptail --infobox "Reiniciando NGINX..." 8 39
    sudo systemctl restart nginx

    # Instalação do PostgreSQL
    whiptail --infobox "Instalando PostgreSQL..." 8 39
    sudo apt-get install -y postgresql

    # coletar a senha de root
    PG_PWD=$(whiptail --inputbox "Informe a senha do postgres (SA):" 8 39 --title "Senha Postgres" 3>&1 1>&2 2>&3)

    # Alteração da senha do usuário 'postgres'
    whiptail --infobox "Alterando a senha do usuário postgres..." 8 39
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$PG_PWD';"

    # Execução do script db_core.sql
    whiptail --infobox "Executando script db_core.sql..." 8 39
    sudo -u postgres psql -f ./DB_CORE.SQL

    # Iniciar o PostgreSQL
    whiptail --infobox "Iniciando PostgreSQL..." 8 39
    sudo systemctl restart postgresql

    # Iniciar o serviço com PM2
    whiptail --infobox "Iniciando o serviço core-service com PM2..." 8 39
    cd ./Backend/backend/src/
    npm install
    pm2 start core-service.js --name "core-service"
    #SALVA OS SERVIÇOS PM2 PARA PERSISTIR APÓS RESTART
    pm2 save 
    pm2 startup
}


install_front() {
    # Escreve no arquivo .env
    echo "Escrevendo dados no arquivo .env do front..."
     ENV_FILE_FRONT="./Frontend/vite-project/.env"
    echo "Escrevendo dados no arquivo .env front..."
    echo "VITE_HOSTNAME=$HOST" >> $ENV_FILE_FRONT
    echo "SSL_CERT=$SSL_CERT" >> $ENV_FILE_FRONT
    echo "SSL_CERT=$SSL_KEY" >> $ENV_FILE_FRONT

    cd ./Frontend/vite-project/

    npm install
    pm2 start npm --name 'core-front' -- run dev

    #SALVA OS SERVIÇOS PM2 PARA PERSISTIR APÓS RESTART
    pm2 save 
    pm2 startup


}

# Coleta os dados do administrador
prompt_info_num_servidores


