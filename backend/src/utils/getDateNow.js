export function getDateNow() {
    // Cria uma nova data com a data e hora atuais em UTC
    var date = new Date();
    // Adiciona o deslocamento de GMT-3 às horas da data atual em UTC
    //date.setUTCHours(date.getUTCHours()-3);

    // Formata a data e hora em uma string ISO 8601 com o caractere "T"
    //var dateString = date.toISOString();

    // Substitui o caractere "T" por um espaço
    //dateString = dateString.replace("T", " ");

    // Retorna a string no formato "AAAA-MM-DDTHH:mm:ss.sss"
    return date.toISOString() //dateString.slice(0, -5);
}
