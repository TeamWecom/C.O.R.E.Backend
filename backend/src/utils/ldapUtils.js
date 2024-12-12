import ldap from 'ldapjs';

export async function returnContacts() {
    try {
        const ldapUrl = 'ldap://10.10.20.42';
        const bindDN = 'inn-lab-ap.wecom.com.br\\contacts';
        const bindCredentials = '0:cH@!9QKZ)Kg=$';
        const baseDN = 'dc=entries';
        const filter = '(metaSearchNumber=+%)'; // Ou ajuste para um filtro mais amplo, como '(objectClass=*)'
        const attributes = ['cn', 'sn', 'mail', 'telephonenumber'];

        // Monta a URL para fins de visualização
        const url = `${ldapUrl}/${baseDN}?${attributes.join(',')}?sub?${filter}?bindname=${bindDN}`;
        console.log('LDAP URL:', url);

        // Conexão e consulta
        const client = ldap.createClient({ url: ldapUrl });

        client.bind(bindDN, bindCredentials, (err) => {
            if (err) {
                console.error('Erro ao autenticar:', err);
                return;
            }

            const opts = {
                filter,
                scope: 'sub',
                attributes,
            };

            client.search(baseDN, opts, (err, res) => {
                if (err) {
                    console.error('Erro na consulta:', err);
                    return;
                }

                res.on('searchEntry', (entry) => {
                    console.log('Entrada encontrada:', entry.object);
                });
                res.on('searchReference', (entry) => {
                  console.log('Entrada encontrada:', entry.object);
              });
              res.on('addListner', (entry) => {
                console.log('Entrada encontrada:', entry.object);
            });

                res.on('end', (result) => {
                    console.log('Consulta finalizada com status:', result.status);
                    client.unbind();
                });
            });
        });
    } catch (error) {
        console.error('Erro ao consultar:', error);
    }
}
