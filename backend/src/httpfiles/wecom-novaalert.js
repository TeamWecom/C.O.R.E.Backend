

var Wecom = Wecom || {};
function onload(start, args) {
    this.createNode("body");
    var that = this;

    //var phoneApi = start.consumeApi("com.innovaphone.phone");
    var phoneApi = start.consumeApi("com.innovaphone.phone");
    var calllistApi = start.consumeApi("com.innovaphone.calllist");
    var avatar = start.consumeApi("com.innovaphone.avatar");
    calllistApi.send({ mt: "Subscribe", count: 1 }, "*");
    calllistApi.onmessage.attach(calllistonmessage);

    var colorSchemes = {
        dark: {
            "--bg": "url('wecom-white.png')",
            "--button": "#929292",
            "--text-standard": "white",
        },
        light: {
            "--bg": "url('wecom-white.png')",
            "--button": "#929292",
            "--text-standard": "white",
        }
    };
    var schemes = new innovaphone.ui1.CssVariables(colorSchemes, start.scheme);
    start.onschemechanged.attach(function () { schemes.activate(start.scheme) });

    var texts = new innovaphone.lib1.Languages(Wecom.novaalertTexts, start.lang);
    start.onlangchanged.attach(function () { texts.activate(start.lang) });

    var app = new innovaphone.appwebsocket.Connection(start.url, start.name);
    app.checkBuild = true;
    app.onconnected = app_connected;
    app.onmessage = app_message;
    app.onclosed = waitConnection;
    app.onerror = waitConnection;
    waitConnection();

    //Var globais das divs
    var userUI;
    var colesquerda;
    var container;
    var coldireita;
    var divButtonsMain;
    var divOptionsMain;
    var zoneDiv;

    var scroll;
    var popup;
    var teste;
    var list_active_alarms = [];
    var button_clicked = [];
    var list_users = [];
    var list_buttons = [];
    var list_sensors_history = []
    var list_sensors = []
    var popupOpen = false;
    var session;
    
    var options = [
        { id: 'floor', img: './images/map.svg'}, 
        { id: 'map', img: './images/location.svg'}, 
        { id: 'sensor', img: './images/wifi.svg'}, 
        { id: 'radio', img: './images/warning.svg'},
        { id: 'video', img: './images/camera.svg'}
    ]

    function app_connected(domain, user, dn, appdomain) {
        app.send({api: "user", mt: "TableUsers"}); //Requisita a lista de usuarios do PBX
        app.send({api: "user", mt: "SelectSensorInfo"})
        app.send({api: "user", mt: "SelectSensorName"})
        userUI = user;
        var browserName = navigator.appCodeName;
        console.log("Navegador:", browserName);
        
        var screenWidth = window.screen.width;
        var screenHeight = window.screen.height;
        console.log("Resolução da tela:", screenWidth, "x", screenHeight);
                

        if (app.logindata.info.unlicensed) {
            //sem licença
            app.send({ api: "user", mt: "UserSession", info: browserName }); //Inicializa o ramal
        }
        else {
            //licenciado
            app.send({ api: "user", mt: "UserSession", info: browserName }); //Inicializa o ramal

        }

        //avatar
        avatar = new innovaphone.Avatar(start, user, domain);
        teste = avatar.url(user, 100, dn);
        console.log("avatar" + JSON.stringify(teste));

        var phoneinfoApi = start.provideApi("com.innovaphone.phoneinfo");
        phoneinfoApi.onmessage.attach(function (sender, obj) {
            switch (obj.msg.mt) {
                case "CallAdded":
                    start.show();
                    //console.warn(obj.msg.mt);
                    console.log(obj.msg);
                    break;
                case "CallUpdated":
                    console.warn(obj.msg.mt);
                    console.log(obj.msg);
                    // show app if call is in connected state
                    if (obj.msg.state === "Connected") start.show();
                    break;
                case "CallRemoved":
                    start.show();
                    //console.warn(obj.msg.mt);
                    console.log(obj.msg);

                    // show home screen after the call is ended
                    //start.home();
                    break;
            }
        });
        
    }

    var buttonClicked = function (evt) {
        // Dentro do objeto evt esta o target, e o target tem um value:
        var type = evt.currentTarget.attributes['button_type'].value;
        var prt = evt.currentTarget.attributes['button_prt'].value;
        //var btn_id = evt.currentTarget.attributes['button_id'].value;
        var id = evt.currentTarget.attributes['id'].value;

        //try {
        //    var prt_user = evt.currentTarget.attributes['button_prt_user'].value;
        //} catch {
        //    var prt_user = "";
        //}
        var name = evt.currentTarget.innerText;
        updateScreen(id, name.split("\n")[0], type, prt);
    };
    function findById(id) {
        return function (value) {
            if (String(value.id) == String(id)) {
                return true;
            }
            //countInvalidEntries++
            return false;
        }
    }
    function deleteById(id) {
        return function (value) {
            if (value.id != id) {
                return true;
            }
            //countInvalidEntries++
            return false;
        }
    }

    
    function app_message(obj) {
        if (obj.api == "user" && obj.mt == "UserSessionResult") {
            console.log(obj.session);
            session = obj.session;
            app.send({ api: "user", mt: "InitializeMessage", session: session }); //Inicializa o ramal
        }
        if (obj.api == "user" && obj.mt == "NoLicense") {
            console.log(obj.result);
            makeDivNoLicense(obj.result);
        }
        if (obj.api == "user" && obj.mt == "UserInitializeResultSuccess") {
            app.send({ api: "user", mt: "SelectMessage" }); //Requisita os botões
        }

        if (obj.api == "user" && obj.mt == "SelectSensorInfoResult") {
            console.log("SENSOR list_history " + JSON.stringify(obj.result))
            list_sensors_history = obj.result
        }
        if (obj.api == "user" && obj.mt == "SelectSensorNameResult") {
            console.log("SENSOR list_sensor" + JSON.stringify(obj.result))
            list_sensors = obj.result
        }

        if (obj.api == "user" && obj.mt == "SelectMessageSuccess") {
            connected();
            console.log(obj.result);
            list_buttons = JSON.parse(obj.result);
            popButtons(list_buttons,1); //Cria os botões na tela
            leftBottomButons()
            createGridZero("floor")
                .then(function (message) {
                    console.log("createGridZero" + message);
                })
                .catch(function (error) {
                    console.log("createGridZero" + error);
                });
            app.send({ api: "user", mt: "UserPresence" }); //Requisita a lista de ususários conectados
        }
        if (obj.api == "user" && obj.mt == "TableUsersResult") {
            console.log(obj.result);
            list_users = JSON.parse(obj.result);
        }
        if (obj.api == "user" && obj.mt == "UserConnected") {
            console.log(obj.src);
            updateListUsers(obj.src, obj.mt);
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prt="' + obj.src + '"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    // Altera as características do elemento
                    elemento.style.backgroundColor = "darkgreen";
                }
                //document.getElementById(obj.src).style.backgroundColor = "darkgreen";
            } catch {
                console.log("UserConnected not button");
            }

        }
        if (obj.api == "user" && obj.mt == "UserDisconnected") {
            console.log(obj.src);
            updateListUsers(obj.src, obj.mt);
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prt="' + obj.src + '"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    // Altera as características do elemento
                    elemento.style.backgroundColor = "var(--button)";
                    elemento.style.borderColor = "var(--button)";
                }
                //document.getElementById(obj.src).style.backgroundColor = "var(--button)";
                //document.getElementById(obj.src).style.borderColor = "var(--button)";
            } catch {
                console.log("UserDisconnected not button");
            }

        }
        if (obj.api == "user" && obj.mt == "AlarmSuccessTrigged") {
            try {

                list_active_alarms.filter(function(a){return a != obj.alarm})
                console.log("danilo req:AlarmSuccessTrigged Alarme removido da lista list_active_alarms: "+list_active_alarms);
                updateDeactiveAlarmButtons()

                // button_clicked = button_clicked.filter(deleteById(obj.btn_id));
                // var clicked = document.getElementById(obj.btn_id);
                // var elemento = document.getElementById(obj.btn_id)
                // elemento.children[0].classList.add("gold-900")
                // elemento.children[1].classList.add("gold-600")
            } catch {
                console.log("danilo req: Alarme acionado não estava ativo no botão.");
                
            } finally {
                //addNotification("out", "Alarme " + obj.alarm);
                addNotification('alarm', 'inc', obj.alarm, obj.from, obj.to)
                    .then(function (message) {
                        console.log(message);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
            }
            //var clicked = document.getElementById(obj.src);
            //document.getElementById(obj.src).style.backgroundColor = "var(--button)";
            //if (clicked.className == "allbuttonClicked") {
            //    document.getElementById(obj.value).setAttribute("class", "allbutton");
            //}
        }
        if (obj.api == "user" && obj.mt == "ComboSuccessTrigged") {
            //var clicked = document.getElementById(obj.src);
            try {
                button_clicked = button_clicked.filter(deleteById(obj.src));
                document.getElementById(obj.src).style.backgroundColor = "";

            } catch {

            } finally {

            }
            //if (clicked.className == "allbuttonClicked") {
            //    document.getElementById(obj.value).setAttribute("class", "allbutton");
            //}
        }
        if (obj.api == "user" && obj.mt == "AlarmReceived") {
            console.log(obj.alarm);

            try {
                list_active_alarms.push(obj.alarm) //insere o alarme na lista para consulta posterior
                console.log("danilo req:AlarmReceived Alarme incluido da lista list_active_alarms: "+list_active_alarms);
                updateActiveAlarmButtons()
                console.log("danilo req: Lista de botões clicados atualizada: " + JSON.stringify(button_clicked));
            } catch (e){
                makePopup("ATENÇÃO", "<p class='popup-alarm-p'>Alarme Recebido: " + obj.alarm + "</p><br/><p class='popup-alarm-p'>Origem: " + obj.src +"</p>", 500, 200);
            } finally {
                //addNotification("inc", "Alarme " + obj.alarm);
                addNotification('alarm', 'inc', obj.alarm, obj.src, userUI)
                    .then(function (message) {
                        console.log(message);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
            }
            

        }
        if (obj.api == "user" && obj.mt == "ComboAlarmStarted") {
            console.log(obj.alarm);
            try {
                var button_found = [];
                list_buttons.forEach(function (l) {
                    if (l.button_prt == obj.alarm) {
                        button_found.push(l);
                    }
                })
                //var clicked = document.getElementById(obj.alarm);
                //document.getElementById(obj.alarm).style.backgroundColor = "darkred";

                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prt="' + obj.alarm + '"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    // Altera as características do elemento
                    if (elemento.children[0].classList.contains("vermelho-900") && elemento.children[1].classList.contains("vermelho-600")) {
                        elemento.children[0].classList.remove("vermelho-900")
                        elemento.children[1].classList.remove("vermelho-600")
                        elemento.children[0].classList.add("gold-900")
                        elemento.children[1].classList.add("gold-600")
                        button_clicked = button_clicked.filter(button => button.id != elemento.id);

                    } else {
                        elemento.children[0].classList.remove("gold-900")
                        elemento.children[1].classList.remove("gold-600")
                        elemento.children[0].classList.add("vermelho-900")
                        elemento.children[1].classList.add("vermelho-600")
                        button_clicked.push({ id: String(elemento.id), type: "alarm", name: button_found[i].button_name, prt: obj.alarm });
                    }
                }
                console.log("danilo req: Lista de botões clicados atualizada: " + JSON.stringify(button_clicked));
            } catch (e) {
                //makePopup("ATENÇÃO", "<p class='popup-alarm-p'>Alarme Recebido: " + obj.alarm + "</p><br/><p class='popup-alarm-p'>Origem: " + obj.src + "</p>", 500, 200);
            } finally {
                //addNotification("inc", "Alarme " + obj.alarm);
                //addNotification('inc', texts.text("alarm") + " " + obj.alarm, obj.src, userUI)
                //    .then(function (message) {
                //        console.log(message);
                //    })
                //    .catch(function (error) {
                //        console.log(error);
                //    });
            }


        }
        if (obj.api == "user" && obj.mt == "PageRequest") {
            console.log(obj.alarm);
            //document.getElementById(obj.alarm).setAttribute("class", "allbuttonClicked");
            //updateScreen(obj.btn_id, obj.name, "page", obj.alarm);
            //makePopup("Alarme Recebido!!!!", obj.alarm, 500, 200);
            //addNotification(">>>  " + obj.alarm);
            if (obj.type == "dest") {

                console.log("PageRequest dest" );
                // Encontre o elemento pelo seu ID
                var btnOption = document.getElementById(obj.btn_id);

                // Verifique se o elemento foi encontrado
                if (btnOption) {
                    // Crie um evento de clique
                    var eventoClique = new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });

                    // Dispare o evento de clique no elemento
                    btnOption.dispatchEvent(eventoClique);
                } else {
                    console.log('Elemento não encontrado.');
                }
            } else{
                createGridZero(obj.type)
                    .then(function (message) {
                        console.log("createGridZero" + message);
                        // Encontre o elemento pelo seu ID
                        var btnOption = document.getElementById(obj.btn_id);

                        // Verifique se o elemento foi encontrado
                        if (btnOption) {
                            // Crie um evento de clique
                            var eventoClique = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window
                            });

                            // Dispare o evento de clique no elemento
                            btnOption.dispatchEvent(eventoClique);
                        } else {
                            console.log('Elemento não encontrado.');
                        }
                    })
                    .catch(function (error) {
                        console.log("createGridZero" + error);
                    });
            }
            
        }
        // if (obj.api == "user" && obj.mt == "PopupRequest") {
        //     console.log(obj.alarm);
        //     //document.getElementById(obj.alarm).setAttribute("class", "allbuttonClicked");
        //     updateScreen(obj.btn_id, obj.name, "popup", obj.alarm);
        //     //makePopup("Alarme Recebido!!!!", obj.alarm, 500, 200);
        //     //addNotification(">>>  " + obj.alarm);
        // }
        // if (obj.api == "user" && obj.mt == "ButtonRequest") {
        //     console.log(obj.button);
        //     var btn = JSON.parse(obj.button);
        //     updateScreen(btn.id, btn.button_name, btn.button_type, btn.button_prt);
 
        // }
        if (obj.api == "user" && obj.mt == "CallRinging") {
            console.log(obj.src);
            var element = obj.src + "-status";
            console.log(element);
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.src + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        //var primeiroFilho = elemento.children[0];
                        //primeiroFilho.classList.add("gold-900")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.add("gold-600")
                    }
                }
                
            } catch (e){
                console.log("CallRinging is not button");
            }
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.num + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        //var primeiroFilho = elemento.children[0];
                        //primeiroFilho.classList.add("gold-900")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.add("gold-600")
                    }
                }
                
            } catch (e){
                console.log("CallRinging is not button");
            } 
        }
        if (obj.api == "user" && obj.mt == "IncomingCallRinging") {
            console.log(obj.src);
            var element = obj.src + "-status";
            console.log(element);
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.src + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        //var primeiroFilho = elemento.children[0];
                        //primeiroFilho.classList.add("gold-900")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.add("gold-600")
                    }
                }
                
            } catch (e) {
                console.log("CallRinging is not button");
            }
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.num + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        //var primeiroFilho = elemento.children[0];
                        //primeiroFilho.classList.add("gold-900")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.add("gold-600")
                    }
                }
                
            } catch (e) {
                console.log("CallRinging is not button");
            }

            if (obj.src == userUI && popupOpen == false) {
                makePopupCall("Chamando", "<button type='button' class='popup-connect'>ATENDER</button><button type='button' class='popup-clear'>RECUSAR</button>", 400, 100, obj.btn_id);
            }
        }
        if (obj.api == "user" && obj.mt == "ComboCallStart") {
            console.log(obj.src);
            var element = obj.src + "-status";
            console.log(element);
            try {
                var clicked = button_clicked.filter(findById(obj.btn_id));
                if (clicked.length == 0) {
                    var button_found;
                    list_buttons.forEach(function (l) {
                        if (l.id == obj.btn_id) {
                            button_found = l;
                        }
                    })
                    //var button = list_buttons.filter(findByPrt(obj.num));
                    var elemento = document.getElementById(obj.btn_id);
                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        var primeiroFilho = elemento.children[0];
                        primeiroFilho.classList.remove("gold-900", "verde-900")
                        primeiroFilho.classList.add("vermelho-900")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.remove("verdeo-600", "gold-600")
                        segundoFilho.classList.add("vermelho-600")

                    } else {
                        elemento.classList.remove("neutro-800")
                        elemento.classList.add("vermelho-900")
                    }
                    button_clicked.push({ id: button_found.id, type: button_found.button_type, name: button_found.button_name, prt: obj.num });
                    console.log("danilo req: Lista de botões clicados atualizada: " + JSON.stringify(button_clicked));

                }
                

            } catch {
                console.log("CallRinging is not button");
            } finally {
                //makePopup("Chamada Conectada!!!!", obj.src, 500, 200);
                //addNotification("inc","Tocando " + obj.src);
            }
        }
        if (obj.api == "user" && obj.mt == "CallConnected") {
            console.log(obj.src);
            var element = obj.src+"-status";
            console.log(element);
            console.log("Chamada Conectada")
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.src + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        var primeiroFilho = elemento.children[0];
                        //primeiroFilho.classList.remove("gold-900", "verde-900","vermelho-900")
                        // primeiroFilho.classList.add("net")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.remove("gold-600", "verde-600")
                        segundoFilho.classList.add("vermelho-600")
                    }
                }
                //document.getElementsByTagName("div")[obj.src + "-status"].style.backgroundColor = "rgb(231 8 8 / 48%)";
                // addNotification('inc', "Conectado " + obj.src)
                //     .then(function (message) {
                //         console.log(message);
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //     });
            } catch (e){
                console.log("CallConnected is not button");
            }
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.num + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        var primeiroFilho = elemento.children[0];
                      //primeiroFilho.classList.remove("gold-900", "verde-900","vermelho-900")
                        // primeiroFilho.classList.add("net")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.remove("gold-600")
                        segundoFilho.classList.add("vermelho-600")
                    }
                }
                //document.getElementsByTagName("div")[obj.num + "-status"].style.backgroundColor = "rgb(231 8 8 / 48%)";
                // addNotification('inc', "Conectado " + obj.num)
                //     .then(function (message) {
                //         console.log(message);
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //     });
            } catch (e){
                console.log("CallConnected is not button");
            }
            if (obj.src == userUI && popupOpen == true) {
                popup.close();
                popupOpen = false;
            }
        }
        if (obj.api == "user" && obj.mt == "CallDisconnected") {
            console.log(obj.src);
            var element = obj.src + "-status";
            console.log(element);
            console.log("Chamada Disconectada")
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.src + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];

                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        var primeiroFilho = elemento.children[0];
                        primeiroFilho.classList.remove("gold-900", "vermelho-900")
                        primeiroFilho.classList.add("verde-900")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.remove("vermelho-600", "gold-600")
                        segundoFilho.classList.add("verde-600")
                    } else {
                        elemento.classList.remove("vermelho-900")
                        elemento.classList.add("neutro-800")
                    }

                }
                //document.getElementsByTagName("div")[obj.src + "-status"].style.backgroundColor = "";
                //var sipButton = document.getElementById(obj.src);
                //if (sipButton.style.backgroundColor == "darkred") {
                //    document.getElementById(obj.src).style.backgroundColor = "darkgreen";
                //    //document.getElementById(value).setAttribute("class", "allbutton");
                //}
                // addNotification('inc', "Desconectado " + obj.src)
                //     .then(function (message) {
                //         console.log(message);
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //     });
            } catch (e){
                console.log("CallDisconnected not button");
            }
            try {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prtstatus="' + obj.num + '-status"]');

                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];
                    var type = elemento.getAttribute("button_type")
                    if (type != "dest") {
                        var primeiroFilho = elemento.children[0];
                        primeiroFilho.classList.remove("gold-900", "vermelho-900")
                        primeiroFilho.classList.add("verde-900")
                        var segundoFilho = elemento.children[1];
                        segundoFilho.classList.remove("vermelho-600", "gold-600")
                        segundoFilho.classList.add("verde-600")
                    } else {
                        elemento.classList.remove("vermelho-900")
                        elemento.classList.add("neutro-800")
                    }
                }
                //document.getElementsByTagName("div")[obj.num + "-status"].style.backgroundColor = "";
                //var sipButton = document.getElementById(obj.btn_);
                //if (sipButton.style.backgroundColor == "darkred") {
                //    document.getElementById(obj.).style.backgroundColor = "darkgreen";
                //    //document.getElementById(value).setAttribute("class", "allbutton");
                //}
                // addNotification('inc', "Desconectado " + obj.num)
                //     .then(function (message) {
                //         console.log(message);
                //     })
                //     .catch(function (error) {
                //         console.log(error);
                //     });
            } catch (e){
                console.log("CallDisconnected not button");
            }
            //try {
            //    var user_conn = list_users.filter(function (user) { return user == obj.src });
            //    if (obj.src == userUI && user_conn.length > 0) {
            //        document.getElementById(obj.btn_id).style.backgroundColor = "darkgreen";
            //    } else {
            //        document.getElementById(obj.btn_id).style.backgroundColor = "";
            //    }
            //} catch (e){
            //    console.log("CallDisconnected number dialed not button");
            //}
            //if (obj.src == userUI && popupOpen == true) {
            //    popup.close();
            //    popupOpen = false;
            //}

            button_clicked = button_clicked.filter(deleteById(obj.btn_id));
            console.log("danilo req: Lista de botões clicados atualizada: " + JSON.stringify(button_clicked));
        }
        if (obj.api == "user" && obj.mt == "DevicesList") {

            console.log("makePopupDevice");
            var styles = [new innovaphone.ui1.PopupStyles("popup-background", "popup-header", "popup-main", "popup-closer")];
            var h = [20];
            var _popup = new innovaphone.ui1.Popup("position: absolute; display: inline-flex; left:50px; top:50px; align-content: center; justify-content: center; flex-direction: row; flex-wrap: wrap; width:400px; height:200px;", styles[0], h[0]);
            _popup.header.addText(texts.text("labelDeviceTitle"));

            var devices = obj.devices;
            var iptDeviceTitle = new innovaphone.ui1.Div("position:absolute; left:0%; width:50%; top:40%; font-size:15px; text-align:right", texts.text("labelDevice"));
            var iptDevice = new innovaphone.ui1.Node("select", "position:absolute; left:50%; width:30%; top:40%; font-size:12px; text-align:rigth", null, null);
            iptDevice.setAttribute("id", "selectDevice");
            devices.forEach(function (dev) {
                iptDevice.add(new innovaphone.ui1.Node("option", "font-size:12px; text-align:center", dev.text, null).setAttribute("id", dev.hw));
            })
            //Botão Salvar
            var btnSelectDevice = new innovaphone.ui1.Div("position:absolute; left:40%; width:20%; top:70%; font-size:15px; text-align:center", null, "button-inn").addTranslation(texts, "btnSave").addEvent("click", function () {
                var hw = document.getElementById("selectDevice");
                var selectedOption = hw.options[hw.selectedIndex];
                var hw = selectedOption.id;
                if (String(hw) == "") {
                    window.alert("Atenção!! Complete todos os campos.");
                } else {
                    app.send({ api: "user", mt: "DeviceSelected", hw: String(hw), src: obj.src });
                    _popup.close()
                }
            });

            _popup.content.add(iptDeviceTitle);
            _popup.content.add(iptDevice);
            _popup.content.add(btnSelectDevice);
        }
        if (obj.api == "user" && obj.mt == "SensorAllInfoResult") {
                    console.log("SENSOR list_history " + JSON.stringify(obj.result))
                    list_sensors_history = obj.result
        }
        if (obj.api == "user" && obj.mt == "SensorReceived") {
            var sensorButtons = list_buttons.filter(function(object) {
                return object.button_type == "sensor" && object.page != 0 && object.button_prt == obj.value["sensor_name"];
            });
            console.log("SensorButtons " + JSON.stringify(sensorButtons))
            var info = obj.value; // valor recebido do banco
            sensorButtons.forEach(function(object) {
                    var divToUpdate = document.querySelector('.sensorbutton[position-x="' + object.position_x + '"][position-y="' + object.position_y + '"][page="' + object.page + '"]');
                    updateButtonInfo(divToUpdate, info, object.sensor_type, object.sensor_min_threshold, object.sensor_max_threshold, object.button_prt);

            });
        }

    }
    function colEsquerdaTeclado(){
        
        /* var teclado = colesquerda.add(new innovaphone.ui1.Div(null,null,"teclado"));
        var divBackspace = teclado.add(new innovaphone.ui1.Div(null,null,"backspace"));
        var textarea = divBackspace.add(new innovaphone.ui1.Node("textarea",null,null,"type"))
        textarea.setAttribute("id","resultado");
        var divBackspaceIcon = divBackspace.add(new innovaphone.ui1.Div(null,null,"backspace-icon"));
        var buttonbackspace =  divBackspaceIcon.add(new innovaphone.ui1.Node("button",null,null,null));
        buttonbackspace.setAttribute("id","apagar");
        buttonbackspace.setAttribute("value","apagar");
        var imgBackspace = buttonbackspace.add(new innovaphone.ui1.Node("img","width:130%; height:100%; margin-left: -5px;",null,null));
        imgBackspace.setAttribute("src","backspace.png");
        var divTeclado = teclado.add(new innovaphone.ui1.Div(null,null,"flex-teclado"));
        for(var i = 0; i < 9; i++){
            var btn = divTeclado.add(new innovaphone.ui1.Node("button",null, i+1,"typebtn"));
            btn.setAttribute("id",i+1)
        }
        var btn2 = divTeclado.add(new innovaphone.ui1.Node("button",null,"*","typebtn"));
        var btn3 = divTeclado.add(new innovaphone.ui1.Node("button",null,"0","typebtn"));
        var btn4 = divTeclado.add(new innovaphone.ui1.Node("button",null,"#","typebtn"));

        var ligar = teclado.add(new innovaphone.ui1.Div("display:flex",null,"calling"));
        ligar.setAttribute("id","calling");
        var btnLigar = ligar.add(new innovaphone.ui1.Node("button","width: 50%; height: 40px; background-color: rgb(20, 187, 20); color: rgb(0, 0, 0); font-weight: bold;","LIGAR",null));
        var btnDesligar = ligar.add(new innovaphone.ui1.Node("button","width: 50%; height: 40px; background-color: rgb(248, 23, 23); color: rgb(0, 0, 0); font-weight: bold;","DESLIGAR",null));
        var calls = colesquerda.add(new innovaphone.ui1.Div(null,null,"calls"));
         calls.setAttribute("id","calls");
         */
    }

    function checkZero(data) {
        if (data.length == 1) {
            data = "0" + data;
        }
        return data;
    }
    function makeDivNoLicense(msg) {
        that.clear();
        //Titulo 
        that.add(new innovaphone.ui1.Div("position:absolute; left:0%; width:100%; top:40%; font-size:18px; text-align:center; font-weight: bold; color: darkblue;", msg));

    }
    function popButtons(buttons,page) {

        // var combobtn = coldireita.add(new innovaphone.ui1.Div(null, null, "combobtn"));
        // var allbtn = coldireita.add(new innovaphone.ui1.Div(null, null, "allbtn"));
        // var pagebtn = coldireita.add(new innovaphone.ui1.Div(null, null, "pagebtn"));
        // var pageDivider = coldireita.add(new innovaphone.ui1.Div(null, null, "pageDivider"));

          // div botão combo
          var combobtnDiv = divButtonsMain.add(new innovaphone.ui1.Div(null, null, "combobtn"));
          for (let i = 1; i < 6 ; i++) {
          var combobtn = combobtnDiv.add(new innovaphone.ui1.Div(null,null,"Button combobutton"))
            
            combobtn.setAttribute("page",page)
            combobtn.setAttribute("position-x", 1); 
            combobtn.setAttribute("position-y", i); 
          }

        // linha divisória (hr)
        var dividerLine = divButtonsMain.add(new innovaphone.ui1.Node("hr",null,null,"divider"))

        // div sensores 💣💣💣
            var sensoresBtnDiv = divButtonsMain.add(new innovaphone.ui1.Div(null,null,"sensorBtnDiv"))
            for (let i = 1; i < 6 ; i++) {
                var sensorBtn = sensoresBtnDiv.add(new innovaphone.ui1.Div(null,null,"Button sensorButton"))
                
                sensorBtn.setAttribute("page",page)
                sensorBtn.setAttribute("position-x", 2); 
                sensorBtn.setAttribute("position-y", i); 
        }

          // linha divisória (hr)
          var dividerLine = divButtonsMain.add(new innovaphone.ui1.Node("hr",null,null,"divider"))
          
          var allbtnDiv = divButtonsMain.add(new innovaphone.ui1.Div(null, null, "allbtnDiv"));
          for (let i = 1; i < 31; i++) {
     
            var positionX = Math.ceil(i / 5) + 2; // 5/5 = 1 + 2  é = 3  e assim vai sempre ate 7
            var positionY = i % 5 === 0 ? 5 : i % 5; // 5%5 = 1 e assim vai 
        
            var allbtn = allbtnDiv.add(new innovaphone.ui1.Div(null, null, "Button"));
            
            allbtn.setAttribute("page",page)
            allbtn.setAttribute("position-x", positionX);
            allbtn.setAttribute("position-y", positionY);
        }
          // cameras sensores graficos planta baixa
        var optionsDiv = divOptionsMain.add(new innovaphone.ui1.Div(null, null, "optionsDiv"));
            options.forEach(function (o) {
                var optionsDivBtn = optionsDiv.add(new innovaphone.ui1.Div(null, null, "optionsBtn"));
                optionsDivBtn.setAttribute("id",o.id)
                var divTop = optionsDivBtn.add(new innovaphone.ui1.Div(null, null, "buttontop neutro-800"));
                var imgTop = divTop.add(new innovaphone.ui1.Node("img", null, null, null))
                imgTop.setAttribute("src", o.img)
                var divBottom = optionsDivBtn.add(new innovaphone.ui1.Div(null, texts.text(o.id), "buttondown neutro-900"));
            })

           //paginas de 1 - 5
           var pagesDiv = divOptionsMain.add(new innovaphone.ui1.Div(null,null,"div-page"))
           for (let i = 1; i < 6 ; i++) {
               var pagesBtnDiv = pagesDiv.add(new innovaphone.ui1.Div(null,null,"pagina"))    
               var pagesBtnText = pagesBtnDiv.add(new innovaphone.ui1.Div(null,null,"framePagesText"))   
               var textBtn = pagesBtnText.add(new innovaphone.ui1.Div(null,"Página " + i,"text-wrapper-Pages"))  
               pagesBtnDiv.setAttribute("page", i )
           }     
       
        //var allbtn = document.getElementById("allbtn");
        console.log("TODOS OS BOTÕES " + "\n" + JSON.stringify(buttons))
        //makeAllButtons(buttons,page)

        // criar todos os botões com a função genérica createButtons
        buttons.forEach(function (object) {

            switch (object.button_type) {
                case "combo":
                    createComboButton(object,null,"ciano-600","ciano-900","./images/Layer.svg","combobutton")
                    break;
                case "alarm":
                    createButtons(object,"allbutton","gold-900","gold-600","./images/warning.svg","Button",object.page)
                    break;
                case "number":
                    createButtons(object,"exnumberbutton","verde-900","verde-600","./images/phone.svg","Button",object.page)
                    break;
                case "user":
                    createButtons(object, "userbutton", "verde-900", "verde-600", "./images/user.svg", "Button", object.page)
                    break;
                case "sensor":
                    createSensorButton(object,"sensorbutton","neutro-900","neutro-1000","./images/wifi.svg","sensorButton",object.page) 
                    app.sendSrc({ api: "user", mt: "SelectSensorInfoSrc", type: object.sensor_type, sensor: object.button_prt, src: object.button_prt }, function (obj) {
                        console.log("SendSrcResult: " + JSON.stringify(obj))
                        var divToUpdate = document.querySelector('.sensorbutton[position-x="' + object.position_x + '"][position-y="' + object.position_y + '"][page="' + object.page + '"]');
                        var objParse = JSON.parse(obj.result)[0];
                        updateButtonInfo(divToUpdate, objParse, object.sensor_type , object.sensor_min_threshold, object.sensor_max_threshold, object.button_prt);           
                    })            
                    break;
                default:
                    break;
            }
        });

        var botoes = document.querySelectorAll(".allbutton");
        for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];
            // O jeito correto e padronizado de incluir eventos no ECMAScript
            // (Javascript) eh com addEventListener:
            botao.addEventListener("click", buttonClicked);
        }
        var botoes = document.querySelectorAll(".numberbutton");
        for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];
            // O jeito correto e padronizado de incluir eventos no ECMAScript
            // (Javascript) eh com addEventListener:
            botao.addEventListener("click", buttonClicked);
        }
        var botoes = document.querySelectorAll(".exnumberbutton");
        for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];
            // O jeito correto e padronizado de incluir eventos no ECMAScript
            // (Javascript) eh com addEventListener:
            botao.addEventListener("click", buttonClicked);
        }
        var botoes = document.querySelectorAll(".userbutton");
        for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];
            // O jeito correto e padronizado de incluir eventos no ECMAScript
            // (Javascript) eh com addEventListener:
            botao.addEventListener("click", buttonClicked);
        }
        var botoes = document.querySelectorAll(".pagebutton");
        for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];
            // O jeito correto e padronizado de incluir eventos no ECMAScript
            // (Javascript) eh com addEventListener:
            botao.addEventListener("click", buttonClicked);
        }
        var botoes = document.querySelectorAll(".combobutton");
        for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];
            // O jeito correto e padronizado de incluir eventos no ECMAScript
            // (Javascript) eh com addEventListener:
            botao.addEventListener("click", buttonClicked);
        }
        var pages = document.querySelectorAll(".pagina")
        pages.forEach(function(page){
            var pageAttribute = page.getAttribute("page")
            var divMainAttribute = document.getElementById("divMainButtons").getAttribute("page")
            page.addEventListener("click", function(evt){
                var divPrincipal = document.getElementById("divMainButtons")
                var divOptions = document.getElementById("divOptions")
                divPrincipal.setAttribute("page",pageAttribute)
                divPrincipal.innerHTML = ''
                divOptions.innerHTML = ''
                popButtons(buttons,pageAttribute)
            
            });
            if(divMainAttribute == pageAttribute){
                  page.classList.add("azul-600-bottom")  
            }

        })
        var botoes = document.querySelectorAll(".optionsBtn");
       for (var i = 0; i < botoes.length; i++) {
            var botao = botoes[i];

            // O jeito correto e padronizado de incluir eventos no ECMAScript
            // (Javascript) eh com addEventListener:
            botao.addEventListener("click", function(evt){
                var idBtn = evt.currentTarget.id

                if(!this.classList.contains("clicked")){
                    createGridZero(idBtn)
                        .then(function (message) {
                            console.log("createGridZero" + message);
                        })
                        .catch(function (error) {
                            console.log("createGridZero" + error);
                        });
                }

            });
        }
        updatePageButtons()
        updateActiveAlarmButtons()

    }
    function makePopup(header, content, width, height) {
        console.log("makePopup");
        var styles = [new innovaphone.ui1.PopupStyles("popup-background", "popup-header", "popup-main", "popup-closer")];
        var h = [20];

        var _popup = new innovaphone.ui1.Popup("position: absolute; display: inline-flex; left:50px; top:50px; align-content: center; justify-content: center; flex-direction: row; flex-wrap: wrap; width:" + width + "px; height:" + height + "px;", styles[0], h[0]);
        _popup.header.addText(header);
        _popup.content.addHTML(content);
        if (popupOpen == false) {
            var popupcloser = document.querySelectorAll(".popup-closer");
            for (var i = 0; i < popupcloser.length; i++) {
                var botao = popupcloser[i];
                // O jeito correto e padronizado de incluir eventos no ECMAScript
                // (Javascript) eh com addEventListener:
                botao.addEventListener("click", function () {
                    app.send({ api: "user", mt: "DecrementCount" });
                    popupOpen = false;
                });
            }
            var popupanswer = document.querySelectorAll(".popup-connect");
            for (var i = 0; i < popupanswer.length; i++) {
                var botao = popupanswer[i];
                // O jeito correto e padronizado de incluir eventos no ECMAScript
                // (Javascript) eh com addEventListener:
                botao.addEventListener("click", function () {
                    app.send({ api: "user", mt: "UserConnect" });
                    _popup.close();
                    popupOpen = false;
                });
            }
            var popupanswer = document.querySelectorAll(".popup-clear");
            for (var i = 0; i < popupanswer.length; i++) {
                var botao = popupanswer[i];
                // O jeito correto e padronizado de incluir eventos no ECMAScript
                // (Javascript) eh com addEventListener:
                botao.addEventListener("click", function () {
                    app.send({ api: "user", mt: "EndCall" });
                    _popup.close();
                    popupOpen = false;
                });
            }
            popup = _popup;
            popupOpen = true;
        }
    }
    function makePopupCall(header, content, width, height) {
        console.log("makePopupCall");
        var styles = [new innovaphone.ui1.PopupStyles("popup-background", "popup-header", "popup-main", "popup-closer")];
        var h = [20];

        var _popup = new innovaphone.ui1.Popup("position: absolute; display: inline-flex; left:50px; top:50px; align-content: center; justify-content: center; flex-direction: row; flex-wrap: wrap; width:" + width + "px; height:" + height + "px;", styles[0], h[0]);
        _popup.header.addText(header);
        _popup.content.addHTML(content);
        if (popupOpen == false) {
            var popupcloser = document.querySelectorAll(".popup-closer");
            for (var i = 0; i < popupcloser.length; i++) {
                var botao = popupcloser[i];
                // O jeito correto e padronizado de incluir eventos no ECMAScript
                // (Javascript) eh com addEventListener:
                botao.addEventListener("click", function () {
                    popupOpen = false;
                });
            }
            var popupanswer = document.querySelectorAll(".popup-connect");
            for (var i = 0; i < popupanswer.length; i++) {
                var botao = popupanswer[i];
                // O jeito correto e padronizado de incluir eventos no ECMAScript
                // (Javascript) eh com addEventListener:
                botao.addEventListener("click", function () {
                    //app.send({ api: "user", mt: "UserConnect", btn_id: btn_id });
                    console.warn("::ConnectCall::");
                    phoneApi.send({ mt: "ConnectCall" });
                    _popup.close();
                    popupOpen = false;
                });
            }
            var popupanswer = document.querySelectorAll(".popup-clear");
            for (var i = 0; i < popupanswer.length; i++) {
                var botao = popupanswer[i];
                // O jeito correto e padronizado de incluir eventos no ECMAScript
                // (Javascript) eh com addEventListener:
                botao.addEventListener("click", function () {
                    //app.send({ api: "user", mt: "EndCall", btn_id: btn_id });
                    console.warn("::DisconnectCall::");
                    phoneApi.send({ mt: "DisconnectCall" });
                    _popup.close();
                    popupOpen = false;
                });
            }
            popup = _popup;
            popupOpen = true;
        }
    }
    function updateScreen(id, name, type, prt) {
        var clicked = button_clicked.filter(findById(id));
        if (clicked.length > 0) {
            //DESATIVAR
            
            if (type == "user") {
                // var found = list_users.indexOf(prt);
                found = list_users.findIndex(function(user) {
                    return user.e164 == prt;
                });
                var found = list_users.findIndex(function(user) {
                    return user.e164 == prt;
                });
                if (found != -1) {
                    app.send({ api: "user", mt: "EndCall", prt: String(prt), btn_id: String(id)})
                    //document.getElementById(id).style.backgroundColor = "darkgreen";
                }
            }
            if (type == "number") {
                app.send({ api: "user", mt: "EndCall", prt: String(prt), btn_id: String(id) })
                //document.getElementById(id).style.backgroundColor = "";
            }
            if (type == "alarm") {
                app.send({ api: "user", mt: "DecrementCount" });
                app.send({ api: "user", mt: "TriggerStopAlarm", prt: String(prt), btn_id: String(id) })
                list_active_alarms = list_active_alarms.filter(function(a){return a != prt})
                updateDeactiveAlarmButtons()
                
            }
            
            if (type == "dest") {
                app.send({ api: "user", mt: "EndCall", prt: String(prt), btn_id: String(id) })
                //addNotification("out", name);
                addNotification(type,'out', name, userUI, prt)
                    .then(function (message) {
                        console.log(message);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
                var elemento = document.getElementById(id)
                elemento.classList.remove("vermelho-900")
                elemento.classList.add("neutro-800")
                found = 1;
            }
            //var btn = { id: id, type: type, name: name, prt: prt };
            //button_clicked.splice(button_clicked.indexOf(btn), 1);
            button_clicked = button_clicked.filter(deleteById(id));
            console.log("danilo req: Lista de botões clicados atualizada: " + JSON.stringify(button_clicked));
        }
        else {
            //ATIVAR
            var found = -1;
            
            if (type == "user") {
                found = list_users.findIndex(function(user) {
                    return user.e164 == prt;
                });
                if (found != -1) {
                    app.send({ api: "user", mt: "TriggerCall", prt: String(prt), btn_id: String(id)})
                    //addNotification("out", name);
                    addNotification(type,'out', name, userUI, prt)
                        .then(function (message) {
                            console.log(message);
                        })
                        .catch(function (error) {
                            console.log(error);
                        });
                    var elemento = document.getElementById(id)
                    elemento.children[0].classList.remove("verde-900")
                    elemento.children[1].classList.remove("verde-600")
                    elemento.children[0].classList.add("vermelho-900")
                    elemento.children[1].classList.add("vermelho-600")
                }
            }
            if (type == "number") {
                app.send({ api: "user", mt: "TriggerCall", prt: String(prt), btn_id: String(id)})
                //addNotification("out", name);
                addNotification(type, 'out', name, userUI, prt)
                    .then(function (message) {
                        console.log(message);
                    })
                    .catch(function (error) {
                        console.log(error);
                    });
                    var elemento = document.getElementById(id)
                elemento.children[0].classList.remove("verde-900")
                elemento.children[1].classList.remove("verde-600")
                elemento.children[0].classList.add("vermelho-900")
                elemento.children[1].classList.add("vermelho-600")
                found = 1;
            }
            if (type == "alarm") {
                app.send({ api: "user", mt: "TriggerAlert", prt: String(prt), btn_id: String(id)})

                list_active_alarms.push(prt)
                updateActiveAlarmButtons()
                found = 1;
            }
            if (type == "dest") {
                app.send({ api: "user", mt: "TriggerCall", prt: String(prt), btn_id: String(id) })
                document.getElementById(id).classList.remove("neutro-800");
                document.getElementById(id).classList.add("vermelho-900");
            }
        }
    }
    function updateListUsers(sip, mt) {

        if (mt == "UserConnected") {
            list_users.push(sip);
            console.log("UserConnected updated list " + list_users);
        }
        if (mt == "UserDisconnected") {
            list_users.splice(list_users.indexOf(sip), 1);
            //list_users = list_users.filter(function (x) {
            //    return x != sip;
            //});
            console.log("UserDisconnected updated list " + list_users)
        }
    }
    function waitConnection() {
        that.clear();
        var div1 = that.add(new innovaphone.ui1.Div(null, null, "preloader").setAttribute("id", "preloader"))
        var div2 = div1.add(new innovaphone.ui1.Div(null, null, "inner"))
        var div3 = div2.add(new innovaphone.ui1.Div(null, null, "loading"))
        div3.add(new innovaphone.ui1.Node("span", null, null, "circle"));
        div3.add(new innovaphone.ui1.Node("span", null, null, "circle"));
        div3.add(new innovaphone.ui1.Node("span", null, null, "circle"));
    }
    function connected() {
        that.clear();
        var AllBody = that.add(new innovaphone.ui1.Div(null,null,"AllBody"))
        //Coluna Esquerda
        var col_esquerda = AllBody.add(new innovaphone.ui1.Div(null, null,"colEsquerda"));
        //colunaesquerda adicionar classe depois
        
        //var _container = col_esquerda.add(new innovaphone.ui1.Div("display: none; justify-content: center; position: absolute; height: 40%; width: 100%; align-items: center;", new innovaphone.ui1.Node("img", "width:20%; height:20%;", null, null).setAttribute("src", "./images/play.png"), null));
        // none > flex 

        //Div principal do meio
        var divCenter = AllBody.add(new innovaphone.ui1.Div(null,null,"CenterDiv"))

        //Botões centrais
        var divButtons = divCenter.add(new innovaphone.ui1.Div("width:100% ",null,"divMainButtons"))
        divButtons.setAttribute("id","divMainButtons")
        divButtons.setAttribute("page",1)
    
        //Botões Fixos no final
        var divOptions = divCenter.add(new innovaphone.ui1.Div(null,null,null))
        divOptions.setAttribute("id","divOptions")
        
        //Coluna Direita
        var col_direita = AllBody.add(new innovaphone.ui1.Div(null, null,"colDireita").setAttribute("id","colDireita"));
        var _scroll = col_esquerda.add(new innovaphone.ui1.Node("scroll-container", null, null, "scroll-container"));
        _scroll.setAttribute("id", "scroll-calls");
        var _zoneDiv = col_esquerda.add(new innovaphone.ui1.Div(null,null,"zoneDiv").setAttribute("id","zoneDiv"))
        coldireita = col_direita;
        colesquerda = col_esquerda;
        //container = _container;
        scroll = _scroll;
        zoneDiv = _zoneDiv
        divButtonsMain = divButtons
        divOptionsMain =  divOptions
        leftBottomButons()

    }
    function createGridZero(type) {
        return new Promise(function (resolve, reject) {
            try {
                var btnsClick = document.querySelectorAll('.clicked')
                btnsClick.forEach(function (b) {
                    b.classList.remove('clicked')
                    b.children[0].classList.add("neutro-800")
                    b.children[1].classList.add("neutro-900")
                    b.children[0].classList.remove("azul-marinho-400")
                    b.children[1].classList.remove("azul-500")
                })

                var btnOptions = document.getElementById(type)
                btnOptions.classList.add("clicked")
                btnOptions.children[0].classList.remove("neutro-800")
                btnOptions.children[1].classList.remove("neutro-900")
                btnOptions.children[0].classList.add("azul-marinho-400")
                btnOptions.children[1].classList.add("azul-500")

                console.log("createGridZero Acessado")
                const colRight = document.getElementById("colDireita")
                colRight.innerHTML = ""
                const headerTxt = document.createElement("div")
                headerTxt.id = "headerTxt"
                headerTxt.classList.add("headerTxt")
                headerTxt.textContent = texts.text(type)


                const grid = document.createElement("div")
                grid.id = "gridZero"
                grid.classList.add("gridZero")

                for (var i = 1; i < 13; i++) {

                    var positionX = Math.floor(i / 6) + 1; // Calcula a posição X
                    var positionY = i % 6 === 0 ? 6 : i % 6; // 6%6 = 1 e assim vai 

                    const buttonGrid = document.createElement("div")
                    buttonGrid.id = "optEmpty"+i
                    buttonGrid.classList.add("optEmpty")
                    buttonGrid.setAttribute("position-x", positionX)
                    buttonGrid.setAttribute("position-y", positionY)
                    buttonGrid.setAttribute("page", "0")

                    grid.appendChild(buttonGrid)

                }


                colRight.appendChild(headerTxt)
                colRight.appendChild(grid)

                list_buttons.forEach(function (b) {
                    if (b.page == "0" && b.button_type == type) {
                        createOptions(b)
                    }
                })
                resolve(true)
            } catch (e) {
                reject(false)
            }
        });
    }
    function createOptions(object){

        var selector = `.${"optEmpty"}[position-x='${object.position_x}'][position-y='${object.position_y}'][page='${object.page}']`;
        var allBtns = document.querySelector(selector);
        if (allBtns) {
            allBtns.setAttribute("id", object.id);
            allBtns.setAttribute("button_type", object.button_type);
            allBtns.setAttribute("button_prt", object.button_prt);
            allBtns.setAttribute("button_id", object.id);
            allBtns.setAttribute("button_prtstatus", object.button_prt + "-status");
            allBtns.classList.remove("optEmpty")
            allBtns.classList.add("azul-500", "optFree")
            allBtns.innerHTML = object.button_name
            allBtns.addEventListener("click", function(){
                console.log("Botão clicado", object.button_name)
                if(!this.classList.contains("clicked2")){
                    console.log("Botão clicado", object.button_name)
                    var btnsClick = document.querySelectorAll('.clicked2')
                    btnsClick.forEach(function(b){
                        b.classList.remove('clicked2')
                        b.classList.remove("azul-marinho-1000")
                        b.classList.add("azul-500")
                    })
                    this.classList.add("clicked2")
                    this.classList.add("azul-marinho-1000")
                    this.classList.remove ("azul-500")
                }
                createDivRightBottom(object)
                app.send({api: "user", mt: "SelectSensorInfo"})
            })
        }
    }
    function createDivRightBottom(obj){
        console.log("ERICK OBJ JSON", obj)
        const colRight = document.getElementById("colDireita")
        var btmRight = document.getElementById("bottomR")
        var grafico = document.getElementById("grafico")
        if(btmRight){
            colRight.removeChild(btmRight)
        }
        const bottomRight = document.createElement("div")
        bottomRight.id = "bottomR"
        bottomRight.classList.add("bottomR")
        const txtBottom = document.createElement("div")
        txtBottom.id = "txtBottom"
        txtBottom.classList.add("headerTxt")
        txtBottom.textContent = obj.button_name

        bottomRight.appendChild(txtBottom)

        const buttonLink = obj.button_prt

        if(obj.button_type == "sensor"){
            const unic_sensor = []
            var arrayHistory = JSON.parse(list_sensors_history);
            
            var filtredhistory = arrayHistory.filter(function(h){
                return h.sensor_name == buttonLink;
            });
            console.log("FILTRO HIST", filtredhistory)
            const infoBox = document.createElement("div")
            infoBox.id = "infoBox"
            infoBox.classList.add("infobox")

            const sensorInfoBox = document.createElement("div")
            sensorInfoBox.id = "sensorInfoBox"
            sensorInfoBox.classList.add("sensorInfoBox")
            for(let key in filtredhistory[0]){
                if (filtredhistory[0].hasOwnProperty(key)) {
                    console.log(key + ': ' + filtredhistory[0][key]);
                    if(key !== "date" && key !=="id" && key !=="row_number" && key !== "battery" && key !== "sensor_name" && key !== "row_num" && filtredhistory[0][key] !== null){
                        const sensorBox = document.createElement("div")
                        sensorBox.id = "sensorBox"
                        sensorBox.classList.add("sensorBox")
    
                        const topBox = document.createElement("div")
                        topBox.id = "topBox"
                        topBox.classList.add("topBox", "neutro-700")
                        topBox.textContent = texts.text(key)
    
                        const btmBox = document.createElement("div")
                        btmBox.id = "btmBox"
                        btmBox.classList.add("btmBox", "neutro-900")
                        btmBox.textContent = filtredhistory[0][key]
                        
                        sensorBox.appendChild(topBox)
                        sensorBox.appendChild(btmBox)
                        sensorInfoBox.appendChild(sensorBox)

                        sensorBox.addEventListener("click", function(){
                            var clickBtm = document.querySelectorAll(".btmBox")
                            clickBtm.forEach(function(b){
                                b.classList.remove("neutro-1100")
                            })
                            btmBox.classList.add('neutro-1100')
                            createLineGrafic(filtredhistory, key)
                        })

                    }
                }
            }

          
            infoBox.appendChild(sensorInfoBox)
            bottomRight.appendChild(infoBox)

        
        }else{
            function createFileElement(buttonLink) {
                var fileType = getFileType(buttonLink);
                var element;
            
                if (fileType === 'pdf') {
                    element = document.createElement("embed");
                    element.type = "application/pdf";
                    element.width = "100%";
                    element.height = "400"; // Altura desejada
                } else if (fileType === 'image') {
                    element = document.createElement("img");
                    element.src = buttonLink;
                    element.style.width = '100%'
                } else if (fileType === 'video') {
                    element = document.createElement("video");
                    element.controls = true; // Adiciona controles de vídeo
                    element.autoplay = true; 
                    element.style.width = "100%" 
                    element.style.height = "auto" 
                    // Ajuste a altura conforme necessário
                    var source = document.createElement("source");
                    source.src = buttonLink;
                    source.type = "video/" + buttonLink.split('.').pop(); // Defina o tipo de vídeo com base na extensão
                    element.appendChild(source);
                } 
                else if (fileType === 'google-maps') {
                    element = document.createElement("iframe");
                    element.src = buttonLink;
                    element.style.width = "100%";
                    element.style.height = "100%"; // Altura desejada para o mapa
                    element.style.position = "absolute";
                }
                else {
                    console.error("Tipo de arquivo desconhecido.");
                    return null;
                }
            
                return element;
            }
            // Função para verificar o tipo de arquivo com base na extensão do link
            function getFileType(buttonLink) {
                var extension = buttonLink.split('.').pop().toLowerCase();
                if (extension === 'pdf') {
                    return 'pdf';
                } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(extension)) {
                    return 'image';
                } else if (['mp4', 'webm', 'ogg', 'avi', 'mov','m3u8'].includes(extension)) {
                    return 'video';
                } else if (buttonLink.includes('google.com/maps/embed')) {
                    return 'google-maps';
                } else {
                    return 'unknown';
                }
            }      
            // Exemplo de uso:
            var prtBottom = document.createElement("div");
            prtBottom.id = "prtBottom";
            prtBottom.classList.add("prtBottom");

            var fileElement = createFileElement(buttonLink);
            if (fileElement) {
                prtBottom.appendChild(fileElement);
                // Adicione prtBottom ao seu documento:
                bottomRight.appendChild(prtBottom); // Adicione ao corpo do documento ou outro elemento desejado
            }
        }
        colRight.appendChild(bottomRight)


    }
    function calllistonmessage(consumer, obj) {
        if (obj.msg) {
            console.log("::calllistApi::onmessage() msg=" + JSON.stringify(obj.msg));
            app.send({ api: "user", mt: "CallHistoryEvent", obj: JSON.stringify(obj.msg) });
        }
    }

    //#region funções internas
    function updatePageButtons() {
        var divPrincipal = document.getElementById("divMainButtons")
        var page = divPrincipal.getAttribute("page")
        button_clicked.forEach(function (b) {
            var btn = list_buttons.filter(function (lb) { return lb.id == b.id })[0]
            if (btn.page == page) {
                if (btn.button_type == "user") {
                    var elemento = document.getElementById(btn.id)
                    elemento.children[0].classList.remove("verde-900")
                    elemento.children[1].classList.remove("verde-600")
                    elemento.children[0].classList.add("vermelho-900")
                    elemento.children[1].classList.add("vermelho-600")
                }
                if (btn.button_type == "number") {
                    var elemento = document.getElementById(btn.id)
                    elemento.children[0].classList.remove("verde-900")
                    elemento.children[1].classList.remove("verde-600")
                    elemento.children[0].classList.add("vermelho-900")
                    elemento.children[1].classList.add("vermelho-600")
                }
                if (btn.button_type == "alarm") {
                    var elemento = document.getElementById(btn.id)
                    elemento.children[0].classList.remove("gold-900")
                    elemento.children[1].classList.remove("gold-600")
                    elemento.children[0].classList.add("vermelho-900")
                    elemento.children[1].classList.add("vermelho-600")
                }
                if (btn.button_type == "combo") {
                    var elemento = document.getElementById(btn.id)
                    elemento.children[0].classList.remove("ciano-900")
                    elemento.children[1].classList.remove("ciano-600")
                    elemento.children[0].classList.add("ciano-900")
                    elemento.children[1].classList.add("ciano-600")
                }
            }
        })
    }
    function createDests(object) {

        var selector = `.${"destEmpty"}[position-x='${object.position_x}'][position-y='${object.position_y}'][page='${object.page}']`;
        var allBtns = document.querySelector(selector);
        if (allBtns) {
            allBtns.setAttribute("id", object.id);
            allBtns.setAttribute("button_type", object.button_type);
            allBtns.setAttribute("button_prt", object.button_prt);
            allBtns.setAttribute("button_id", object.id);
            allBtns.setAttribute("button_prtstatus", object.button_prt + "-status");
            allBtns.classList.remove("destEmpty")
            allBtns.classList.add("destFree", "neutro-800")
            const imgBtn = document.createElement('img')
            imgBtn.classList.add("imgBtn")
            imgBtn.id = "imgBtn"
            imgBtn.setAttribute("src", object.img)
            const txtBtn = document.createElement('div')
            txtBtn.classList.add("txtBtn")
            txtBtn.id = "txtBtn"
            txtBtn.textContent = truncateString(object.button_name, "7")


            allBtns.appendChild(imgBtn)
            allBtns.appendChild(txtBtn)

            allBtns.addEventListener("click", function () {
                console.log("Function do Botão ligar para", object.button_name)
                updateScreen(object.id, object.button_name, object.button_type, object.button_prt)
            })
        }
    }

    function updateButtonInfo(mainDiv, info, sensorType, minThreshold, maxThreshold, sensorName) {
        console.log("MaxThreshold " + maxThreshold);
        if (mainDiv && info) {
            var buttonTop = mainDiv.querySelector('.buttontop');
            var buttonDown = mainDiv.querySelector('.buttondown');
            var divInfoId = mainDiv.querySelector('#divInfo');
            var imgBtn = document.createElement("img");
    
            if (divInfoId) {  // quando a mensagem "SensorReceived" é recebida e o botão existe no DOM 
    
                // remover a imagem anterior (se existir)
                var previousImg = divInfoId.querySelector('img');
                if (previousImg) {
                    divInfoId.removeChild(previousImg);
                }
                // adiciona a seta para cima ou baixo conforme a atualização nova em comparação a anterior 
                console.log("Info do sensor: " + info[sensorType])
                console.log("Info Old " + mainDiv.getAttribute("oldInfoSensor"))

                if(parseInt(info[sensorType]) >= parseInt(mainDiv.getAttribute("oldInfoSensor"))){
                    imgBtn.src = "./images/Arrow-up.svg"
                }else{
                    imgBtn.src = "./images/Arrow-down.svg"
                }
                //imgBtn.src =  ? "./images/Arrow-up.svg" : "./images/Arrow-down.svg";
                divInfoId.appendChild(imgBtn);

                // verifica se o threshold foi excedido e atualiza as classes 
                if (parseInt(info[sensorType]) > parseInt(maxThreshold)) {
                    buttonTop.classList.add("vermelho-900");
                    buttonDown.classList.add("vulcano-1000");
                    buttonTop.classList.add("blinking"); // colocar animação do botão piscando

                    // addNotification('sensor', 'out', sensorType, sensorName , userUI)
                    // .then(function (message) {
                    //     console.log(message);
                    // })
                    // .catch(function (error) {
                    //     console.log(error);
                    // });
                    // registrar no histórico qual sensor que explodiu o threshold junto com o horário


                }  // verifica se o minthreshold foi excedido e atualiza as classes 
                else if(parseInt(info[sensorType]) < parseInt(minThreshold)){
                    buttonTop.classList.add("vermelho-900");
                    buttonDown.classList.add("vulcano-1000");
                    buttonTop.classList.add("blinking"); // colocar animação do botão piscando

                    // addNotification('sensor', 'out', sensorType, sensorName , userUI)
                    // .then(function (message) {
                    //     console.log(message);
                    // })
                    // .catch(function (error) {
                    //     console.log(error);
                    // });

                    // registrar no histórico qual sensor que explodiu o threshold junto com o horário

                }
                else {
                    buttonTop.classList.remove("vermelho-900");
                    buttonDown.classList.remove("vulcano-1000");
                    buttonTop.classList.remove("blinking"); // remover animação do botão piscando
                }
                divInfoId.children[0].innerHTML = info[sensorType];  // coloca o novo valor do sensor na div 
                mainDiv.setAttribute("oldInfoSensor",info[sensorType]) // armazena o valor para quando receber um novo fazer a comparação novamente   
                                                             
            } else { // else para quando nao existir o botão no DOM 

                 //verifica se o botão é do tipo "sensor" antes de adicionar as informações
                if (mainDiv.classList.contains("sensorbutton")) {
                    var divInfo = document.createElement("div");
                    divInfo.id = "divInfo";
                    var infoBtn = document.createElement("div");
                    infoBtn.textContent = info[sensorType]; // entregar o co2, temp etc, assim fica dinâmico
                    divInfo.appendChild(infoBtn);
                    mainDiv.setAttribute("oldInfoSensor",info[sensorType])  // armazenar o antigo dado do sensor
                    buttonDown.appendChild(divInfo);
                    // verifica se o limite foi excedido e atualiza as classes para indicar visualmente
                    if (parseInt(info[sensorType]) > parseInt(maxThreshold)) {
                        buttonTop.classList.add("vermelho-900");
                        buttonDown.classList.add("vulcano-1000");
                        buttonTop.classList.add("blinking"); // colocar animação do botão piscando
                    }
                    else if(parseInt(info[sensorType]) < parseInt(minThreshold)){
                        buttonTop.classList.add("vermelho-900");
                        buttonDown.classList.add("vulcano-1000");
                        buttonTop.classList.add("blinking"); // colocar animação do botão piscando
    
                        // addNotification('sensor', 'inc', sensorType, sensorName , userUI)
                        // .then(function (message) {
                        //     console.log(message);
                        // })
                        // .catch(function (error) {
                        //     console.log(error);
                        // });
    
                        // registrar no histórico qual sensor que explodiu o threshold junto com o horário
    
                    }
                }
            }
        }
    }
    function createButtons(object,classButton,bgTop,bgBottom,srcImg,mainButtonClass){
        var found;
        var selector = `.${mainButtonClass}[position-x='${object.position_x}'][position-y='${object.position_y}'][page='${object.page}']`;
        var allBtns = document.querySelector(selector);
        if (allBtns) {
            allBtns.setAttribute("id", object.id);
            allBtns.setAttribute("button_type", object.button_type);
            allBtns.setAttribute("button_id", object.id);
            allBtns.classList.add(classButton)
            var divTop = document.createElement("div")
                divTop.classList.add(bgTop)
                divTop.classList.add("buttontop")
                divTop.setAttribute("id", object.id + "-status");
                //divTop.setAttribute("id", object.button_prt + "-status");
                allBtns.appendChild(divTop)
                var imgTop = document.createElement("img")
                imgTop.style.width = "20px";
                imgTop.setAttribute("src",srcImg)
                divTop.appendChild(imgTop)
                var divTopText = document.createElement("div")
                divTopText.textContent = object.button_name
                divTop.appendChild(divTopText);
                var divBottom = document.createElement("div")
                divBottom.classList.add(bgBottom)
                divBottom.classList.add("buttondown")
                var divBottomTxt = document.createElement("div")
                divBottom.appendChild(divBottomTxt)
                allBtns.appendChild(divBottom)
                allBtns.setAttribute("button_prt", object.button_prt); 
                allBtns.setAttribute("button_prtstatus", object.button_prt + "-status");
                divBottomTxt.textContent = object.button_prt
                found = true;
                list_users.forEach(function(u){
                    if(object.button_prt == u.guid && found){
                        allBtns.setAttribute("button_prt", u.e164); 
                        allBtns.setAttribute("button_prtstatus", u.e164 + "-status");
                        divBottomTxt.textContent = u.cn
                        found = false
                        // se mudar o sip vai refletir aqui 
                        //pois tratamos tudo com GUID no admin
                    }
                })
        }
    }

    function createSensorButton(object,classButton,bgTop,bgBottom,srcImg,mainButtonClass){

        var selector = `.${mainButtonClass}[position-x='${object.position_x}'][position-y='${object.position_y}'][page='${object.page}']`;
        var allBtns = document.querySelector(selector);
        if (allBtns) {
            allBtns.setAttribute("id", object.id);
            allBtns.setAttribute("button_type", object.button_type);
            allBtns.setAttribute("button_prt", object.button_prt);
            allBtns.setAttribute("button_id", object.id);
            allBtns.setAttribute("button_prtstatus", object.button_prt + "-status");
            allBtns.classList.add(classButton)
            var divTop = document.createElement("div")
                divTop.classList.add(bgTop)
                divTop.classList.add("buttontop")
                divTop.setAttribute("id", object.id + "-status");
                //divTop.setAttribute("id", object.button_prt + "-status");
                allBtns.appendChild(divTop)
                var imgTop = document.createElement("img")
                imgTop.style.width = "20px";
                imgTop.setAttribute("src",srcImg)
                divTop.appendChild(imgTop)
                var divTopText = document.createElement("div")
                divTopText.textContent = object.button_name // nome do botão que é o button_name da list_buttons
                divTop.appendChild(divTopText);

                var divBottom = document.createElement("div")
                divBottom.classList.add(bgBottom)
                divBottom.classList.add("buttondown")
                var divBottomTxt = document.createElement("div")
                divBottomTxt.textContent = texts.text(object.sensor_type)
                divBottomTxt.style.fontSize = "13px";
                divBottomTxt.style.margin = '8px';
                divBottomTxt.style.width = "100%"
                divBottom.appendChild(divBottomTxt)
                allBtns.appendChild(divBottom)
        }
    }
    function createComboButton(object,classButton,bgTop,bgBottom,srcImg,mainButtonClass){

        var selector = `.${mainButtonClass}[position-x='${object.position_x}'][position-y='${object.position_y}'][page='${object.page}']`;
        var allBtns = document.querySelector(selector);
        if (allBtns) {
            allBtns.setAttribute("id", object.id);
            allBtns.setAttribute("button_type", object.button_type);
            allBtns.setAttribute("button_prt", object.button_prt);
            allBtns.setAttribute("button_id", object.id);
            allBtns.setAttribute("button_prtstatus", object.button_prt + "-status");
            allBtns.classList.add(classButton)
                // div esquerda (imagem do botão)
            var divImgCombo = document.createElement("div")
                divImgCombo.classList.add(bgTop)
                divImgCombo.classList.add("imgComboBtn")
                divImgCombo.setAttribute("id", object.id + "-status");
                allBtns.appendChild(divImgCombo)
                var imgCombo = document.createElement("img")
                imgCombo.style.width = "40px";
                imgCombo.setAttribute("src",srcImg)
                divImgCombo.appendChild(imgCombo)
                // div direita (nome do botão etc)
                var divComboName = document.createElement("div")
                divComboName.classList.add(bgBottom)
                divComboName.classList.add("divComboName")
                var divComboTopName = document.createElement("div")
                divComboTopName.textContent = object.button_type
                divComboTopName.classList.add("divComboTopName")
                divComboName.appendChild(divComboTopName)
                var divComboBottomName = document.createElement("div")
                divComboBottomName.textContent = object.button_name;
                divComboBottomName.classList.add("divComboBottomName")
                divComboName.appendChild(divComboBottomName)
                allBtns.appendChild(divComboName)
        }
    }
    function updateActiveAlarmButtons(){
        list_active_alarms.forEach(function(id){
            var button_found = [];
            list_buttons.forEach(function (l) {
                if (l.button_prt == id) {
                    button_found.push(l);
                }
            })
    
            var hasClicked = button_clicked.filter(function (bc) { return bc.prt == id })
            if (hasClicked.length==0) {
                // Obtém todos os elementos com o parâmetro btn_id igual a obj.alarm
                var elementos = document.querySelectorAll('[button_prt="' + id + '"]');
    
                // Percorre cada elemento encontrado
                for (var i = 0; i < elementos.length; i++) {
                    var elemento = elementos[i];
                    elemento.children[0].classList.remove("gold-900")
                    elemento.children[1].classList.remove("gold-600")
                    elemento.children[0].classList.add("vermelho-900")
                    elemento.children[1].classList.add("vermelho-600")
                    button_clicked.push({ id: String(elemento.id), type: "alarm", name: button_found[i].button_name, prt: id });
                }
                console.log("danilo req:updateActiveAlarmButtons button_clicked atualizado +: " + button_clicked)
                
            }   
        })    
    }
    function updateDeactiveAlarmButtons(){
        button_clicked.forEach(function(bc){
            if(bc.type=="alarm" && list_active_alarms.findIndex(function(a){return a == bc.prt}) == -1){
                button_clicked = button_clicked.filter(deleteById(bc.id))
                var elemento = document.getElementById(bc.id);
                elemento.children[0].classList.remove("vermelho-900")
                elemento.children[1].classList.remove("vermelho-600")
                elemento.children[0].classList.add("gold-900")
                elemento.children[1].classList.add("gold-600")
            }

        })
        console.log("danilo req:updateDeactiveAlarmButtons button_clicked atualizado -: " + button_clicked) 
    }
    function addNotification(type, flux, msg, from, to) {
        return new Promise(function(resolve, reject) {
            try {
                var today = new Date();
                var day = today.getDate() + "";
                var month = (today.getMonth() + 1) + "";
                var year = today.getFullYear() + "";
                var hour = today.getHours() + "";
                var minutes = today.getMinutes() + "";
            
                const histScroll = document.getElementById("scroll-calls");
            
                const boxDate = document.createElement("div");
                boxDate.id = "boxDate";
                boxDate.classList.add("boxDate");
            
                const boxEvent = document.createElement("div");
                boxEvent.id = "boxEvent";
                boxEvent.classList.add("boxEvent", "lastHistory", 'toastAnimation');
            
                const boxEventTypeStatat = document.createElement("div");
                boxEventTypeStatat.id = "boxEventTypeStatat";
                boxEventTypeStatat.classList.add("boxEventTypeStatat");
            
                const eventType = document.createElement("div");
                eventType.id = "eventType";
                eventType.classList.add("eventType");
                eventType.textContent = texts.text(type);
            
                const eventStatus = document.createElement("div");
                eventStatus.id = "eventStatus";
                eventStatus.classList.add("eventStatus");
                eventStatus.textContent = msg;
            
                const boxEventTexts = document.createElement("div");
                boxEventTexts.id = "boxEventTexts";
                boxEventTexts.classList.add("boxEventTexts");
            
                const eventText1 = document.createElement("div");
                eventText1.id = "eventText1";
                eventText1.classList.add("eventText1");
                eventText1.textContent = from;

                const eventImg1 = document.createElement("img");
                eventImg1.id = "eventImg1";
                eventImg1.classList.add("eventImg1");
                if(flux =='inc'){
                    eventImg1.src = "./images/right-arrow.svg";
                }else{
                    eventImg1.src = "./images/left-arrow.svg";
                }
                
                var cn = list_users.filter(function(u){return u.sip == to})[0].cn;
                const eventText2 = document.createElement("div");
                eventText2.id = "eventText2";
                eventText2.classList.add("eventText2");
                eventText2.textContent = cn;
            
                const boxEventDate = document.createElement("div");
                boxEventDate.id = "boxEventDate";
                boxEventDate.classList.add("boxEventDate");
            
                const eventDate = document.createElement("div");
                eventDate.id = "eventDate";
                eventDate.classList.add("eventDate");
                eventDate.textContent = (day < 10 ? '0' : '') + day + "/" + (month < 10 ? '0' : '') + month;
            
                const eventHour = document.createElement("div");
                eventHour.id = "eventHour";
                eventHour.classList.add("eventHour");
                eventHour.textContent = (hour < 10 ? '0' : '') + hour + ":" + (minutes < 10 ? '0' : '') + minutes;
            
                boxEventTypeStatat.appendChild(eventType);
                boxEventTypeStatat.appendChild(eventStatus);
            
                boxEventTexts.appendChild(eventText1);
                boxEventTexts.appendChild(eventImg1);
                boxEventTexts.appendChild(eventText2);
            
                boxEventDate.appendChild(eventDate);
                boxEventDate.appendChild(eventHour);
            
                boxEvent.appendChild(boxEventTypeStatat);
                boxEvent.appendChild(boxEventTexts);
                boxEvent.appendChild(boxEventDate);
            
                boxDate.appendChild(boxEvent);
                histScroll.insertBefore(boxDate, histScroll.firstChild); // Adiciona no início da lista
            
                resolve('Notification added successfully.');
            } catch (error) {
                reject('Error adding notification: ' + error.message);
            }
        });
    }
    function truncateString(str, maxLength) {
        if (str.length > maxLength) {
            return str.substring(0, maxLength) + "...";
        } else {
            return str;
        }
    }
   function leftBottomButons() {

        const zoneDiv = document.getElementById("zoneDiv")
        zoneDiv.innerHTML = ''

        for (var i = 0; i < 9; i++) {
            var positionX = Math.floor(i / 4) + 1; // Calcula a posição X
            var positionY = (positionX - 1) * 4 + (i % 4) + 1; // Calcula a posição Y
            const buttonGrid = document.createElement("div")
            buttonGrid.id = "destEmpty" + i
            buttonGrid.classList.add("destEmpty")
            buttonGrid.setAttribute("position-x", positionX)
            buttonGrid.setAttribute("position-y", positionY)
            buttonGrid.setAttribute("page", "0")

            zoneDiv.appendChild(buttonGrid)
        }
        list_buttons.forEach(function (zb) {
            if (zb.page == "0" && zb.button_type == "dest") {
                createDests(zb)
            }
        })
    }

    function createBarGrafic(data) {
        const colRight = document.getElementById("colDireita")
        const canvas = document.createElement('canvas');
        canvas.id = "grafico"
        canvas.classList.add("grafico")
        const ctx = canvas.getContext('2d');
    
        var width = canvas.width;
        var height = canvas.height;
        var padding = 20;
    
        var maxX = Math.max.apply(null, data.map(function(pair) { return pair[0]; }));
        var maxY = Math.max.apply(null, data.map(function(pair) { return pair[1]; }));
    
        var barWidth = (width - 2 * padding) / data.length;
        var scaleY = (height - 2 * padding) / maxY;
    
        // Define os valores para o eixo Y
        var yValues = [];
        for (var i = 0; i <= 4; i++) {
            yValues.push(Math.round(i * (maxY / 4)));
        }
    
        function drawBarGraph() {
            ctx.clearRect(0, 0, width, height);
    
            // Desenha os eixos X e Y
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, height - padding);
            ctx.lineTo(width - padding, height - padding);
            ctx.strokeStyle = 'white'; // Define a cor dos eixos
            ctx.stroke();
    
            // Desenha os rótulos dos eixos X e Y
            ctx.fillStyle = 'white'; // Define a cor dos rótulos
            ctx.fillText('X', width - padding + 5, height - padding + 5);
            ctx.fillText('Y', padding - 10, padding - 5);
    
            // Define a cor das barras
            ctx.fillStyle = 'green';
    
            // Desenha as barras do gráfico
            data.forEach(function(pair, index) {
                var x = index * barWidth + padding;
                var barHeight = pair[1] * scaleY;
                var y = height - barHeight - padding;
                ctx.fillRect(x, y, barWidth, barHeight);
                ctx.fillText(pair[1], x + barWidth / 2 - 10, y - 5); // Adiciona o valor da barra
            });
    
            // Desenha os valores no eixo Y
            ctx.fillStyle = 'white'; // Define a cor dos valores do eixo Y
            yValues.forEach(function(value, index) {
                var y = height - index * (height - 2 * padding) / 4 - padding;
                ctx.fillText(value, padding - 20, y + 5);
            });
        }
        colRight.appendChild(canvas)
        drawBarGraph();
    }
    // Cria os gráficos
    function createLineGrafic(data, key) {
        console.log("Grafico", data)
        var grafico = document.getElementById("grafico")

        const btmRight = document.getElementById("bottomR")
        if (grafico) {
            btmRight.removeChild(grafico)
        }

        const canvas = document.createElement('canvas');
        canvas.id = "grafico"
        canvas.classList.add("grafico", "neutro-1000")

        var ctx = canvas.getContext('2d');

        canvas.width = 760; // Defina a largura desejada
        canvas.height = 380; // Defina a altura desejada


        var width = canvas.width;
        var height = canvas.height;
        var padding = 50;
        const resultado = somaGrafico(data, key);

        function somaGrafico(data, chave) {
            let soma = 0;
            data.forEach(function (item) {
                soma += parseInt(item[chave]);
            });
            return soma;
        }
        console.log("MÉDIA GRAFICO Y values", resultado)

        data.sort(function (a, b) {
            return a.id - b.id;
        });

        // Define os valores para o eixo Y
        var maxY = Math.max.apply(null, data.map(function (item) { return item[key]; }));

        const media = Math.round((resultado / data.length) + maxY)

        var scaleY = (height - 2 * padding) / media;

        var maxX = data.length - 1; // O máximo valor de X é o comprimento dos dados menos um
        var intervalWidth = (width - 2 * padding) / maxX;

        console.log("MÉDIA GRAFICO Y key.lengt", data.length)
        console.log("MÉDIA GRAFICO Y maxY", maxY)
        console.log("MÉDIA GRAFICO Y", media)

        // Define os valores para o eixo Y

        var yValues = [];
        for (var i = 0; i <= 4; i++) {
            yValues.push(Math.round(i * (media / 4)));
        }

        function drawLineGraph() {
            ctx.clearRect(0, 0, width + 20, height);

            // Desenha os eixos X e Y
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, height - padding);
            ctx.lineTo(width - padding, height - padding);
            ctx.strokeStyle = 'white'; // Define a cor dos eixos
            ctx.stroke();

            // Desenha os rótulos dos eixos X e Y
            ctx.font = '15px Arial'
            ctx.fillStyle = 'white'; // Define a cor dos rótulos
            ctx.fillText('X', width - padding + 5, height - padding + 5);
            ctx.fillText('Y', padding - 10, padding - 5);

            // Define a cor da linha dos dados
            ctx.strokeStyle = 'green';

            // Desenha os pontos e linhas do gráfico
            ctx.beginPath();
            data.forEach(function (pair, index) {
                var x = index * (intervalWidth - 2) + padding;
                var y = height - pair[key] * scaleY - padding;
                ctx.lineTo(x, y);
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillText(pair[key], x - 5, y - 5); // Adiciona o valor do ponto
            });
            ctx.stroke();

            // Desenha os valores no eixo Y
            ctx.fillStyle = 'white'; // Define a cor dos valores do eixo Y
            yValues.forEach(function (value, index) {
                var y = height - index * (height - 2 * padding) / 4 - padding;
                ctx.fillText(value, 5, y + 10); // Ajuste o valor de 30 para aumentar a margem
            });
        }
        btmRight.appendChild(canvas)
        drawLineGraph();

    }
    
    //#endregion
}

Wecom.novaalert.prototype = innovaphone.ui1.nodePrototype;
