'use strict'
var queryAvailable  = true;
var sessionId;
var formData;
var inputHandler    = 0;

// Authentication variables
var authentication  = false;
var username        = "";
var user_password   = "";
var logging_in      = false;
var signing_in      = false;
var typingPassword  = false;

// Contexts storage
var currentContexts = [];

// Document elements
var form;
var textInput;
var submitButton;
var passwordField;
var chat;
var pageBody;

// Other variables
var saveGame        = false;
var storyContext    = "historia";
var initialContexts = "inicio;".concat(storyContext);
var noStoryContext  = "historia_desactivada";

// Texts
const TEXTS = [
    "¿Quieres reanudar una partida anterior?",
    "Escribe la contraseña. Para volver atrás, no escribas nada.",
    "El nombre de usuario o la contraseña son incorrectos. Escríbe la contraseña de nuevo. Para volver atrás, no escribas nada.",
    "Parece que ha ocurrido un error. Inténtalo de nuevo más tarde.",
    "El nombre de usuario debe tener un mínimo de 4 caracteres. Escríbelo de nuevo. Para volver atrás, no escribas nada.",
    "El nombre de usuario es demasiado largo. Escríbelo de nuevo. Para volver atrás, no escribas nada.",
    "Nombre de usuario válido. Escribe una contraseña (mínimo 8 caracteres). Para volver atrás, no escribas nada.",
    "El nombre de usuario ya existe. Escríbelo de nuevo. Para volver atrás, no escribas nada.",
    "La contraseña debe tener un mínimo de 8 caracteres. Escríbela de nuevo. Para volver atrás, no escribas nada.",
    "La contraseña es demasiado larga. Escríbela de nuevo. Para volver atrás, no escribas nada.",
    "Parece que ha ocurrido un error al iniciar sesión. Inténtalo de nuevo más tarde.",
    "Para comenzar una nueva partida, escribe un nombre de usuario (mínimo 4 caracteres). Para volver atrás, no escribas nada.",
    "Escribe tu nombre de usuario. Para volver atrás, no escribas nada.",
    "¿Quieres reanudar una partida anterior? (Si o No)",
    "Progreso guardado.",
    "Hubo un problema al guardar el progreso.",
    "Enhorabuena, has completado la aventura. Espero que la hayas disfrutado.",
    "Tu progreso se ha reiniciado.",
    "Hola, ",
    ". Disfruta de la aventura.",
    "Si necesitas ayuda, puedes encontrar una breve explicación pulsando en el botón de la esquina superior.",
    "\\t\\n - -  Comunicación iniciada  - - \\n¿Hola?"
];
const RESUME            = 0;
const TYPE_PASSWORD     = 1;
const BAD_LOGIN         = 2;
const ERROR             = 3;
const SHORT_USERNAME    = 4;
const LONG_USERNAME     = 5;
const GOOD_USERNAME     = 6;
const USERNAME_EXISTS   = 7;
const SHORT_PASSWORD    = 8;
const LONG_PASSWORD     = 9;
const LOGIN_ERROR       = 10;
const SIGNIN_USERNAME   = 11;
const TYPE_USERNAME     = 12;
const RESUME2           = 13;
const GAME_SAVED        = 14;
const SAVE_ERROR        = 15;
const GAME_FINISHED     = 16;
const PROGRESS_RESET    = 17;
const WELCOME1          = 18;
const WELCOME2          = 19;
const INSTRUCTIONS      = 20;
const FIRST_MESSAGE     = 21;

function codigoPHP() {
    // Get a random id for the session
    sessionId       = getRandomStringID();

    // Save document elements
    form            = document.querySelector('form');
    textInput       = document.querySelector('[name="text"]');
    submitButton    = document.querySelector('input[name="submit"]');
    passwordField   = document.querySelector('.passwordField');
    chat            = document.querySelector('.chat');
    pageBody        = document.querySelector('body');

    // When screen is small (mobile devices) keep viewport scale proportional to screen
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);

    // For mobile devices, focus input element when clicked or focused
    textInput.addEventListener('focus', focusInput);
    textInput.addEventListener('click', focusInput);

    // Show/hide instrucctions events
    document.querySelector("section img.corner").addEventListener('click', function() {
        document.querySelector("section.instructions").setAttribute('class', 'instructions');
    });
    document.querySelector("section.instructions img.corner").addEventListener('click', function() {
        document.querySelector("section.instructions").setAttribute('class', 'instructions hidden');
    });

    // Make pressing enter to submit the form
    textInput.addEventListener('keydown', (event) => {
        // Check if Enter was pressed
        if(event.which === 13) {
            // Prevents default action
            event.preventDefault();

            // Send form
            form.requestSubmit(submitButton);

            if(typingPassword) {
                passwordField.innerText = "";
            }
        }

        // Update password field when typing password 
        if(typingPassword) {
            setTimeout(function() {
                let fieldValue = textInput.value.length;
                let fieldMessage = "";
                
                while(fieldValue > 0) {
                    fieldMessage += "*";
                    fieldValue--;
                }

                passwordField.innerText = fieldMessage;
            }, 10);
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        if(queryAvailable) {
            // If user is not logged in, user is in authentication process
            if(authentication === false) authenticationInput();

            else if(textInput.value !== "") {
                disableInput();

                // Creates a form data
                formData = new FormData(form);
                formData.set('session', sessionId);
                formData.set('ccontexts', arrayToString(currentContexts));

                // Add user input to conversation
                newUserMessage(textInput.value);

                // Clean input field
                textInput.value = '';
                            
                // Send user input to get a response from bot
                fetch('./php/dialogflowQuery.php', {
                    method : 'POST',
                    body : formData
                }).then(botInteraction).catch(function(err) {
                    console.log('Error fetch: ', err);
                });
            }
        }
    });
    /*
    document.querySelector('button[type="button"]').addEventListener('click', (event) => {
        event.preventDefault();
        let aux = getDialogflowContexts();
        console.log(aux);
    });*/
}

// Control what happens after bot response
function botInteraction(response) {
    // Check if the fetch gets a correct response
    if(response.ok) {
        // Parse response to JSON
        response.json().then(function(datos) {
            if(datos.status != 0) {
                // Get response contexts
                let newContexts = datos.contexts;
                let botResponse = datos.message;

                // Search if save context is active
                if(searchActiveContext(newContexts, "save_game")) {
                    // Save contexts and conversation at database
                    saveGame = true;
                }

                // Search if fallback context is active
                if(searchActiveContext(newContexts, "fallback")) {
                    // If follow up contexts do not preserve, delete them
                    if(searchActiveContext(newContexts, "fallback_nofollowup")) {
                        currentContexts = removeContext(currentContexts, "followup", true);

                        // By default, story interactions are enabled
                        if(searchActiveContext(newContexts, noStoryContext)) {
                            // Remove story context when they are disabled
                            currentContexts = removeContext(currentContexts, storyContext, true);
                        }
                        else if(searchActiveContext(currentContexts, noStoryContext)) {
                            // Enable story contexts when they are no longer disabled
                            currentContexts = removeContext(currentContexts, noStoryContext, true);
                            currentContexts = addContext(currentContexts, storyContext);
                        }
                    }
                    // If contexts change, preserve permanent contexts
                    else if(searchActiveContext(newContexts, "fallback_permanents")) {
                        currentContexts = removeContext(currentContexts, "_permanent", false); 

                        // By default, story interactions are enabled
                        if(!searchActiveContext(newContexts, noStoryContext)) {
                            // Add context to enable story interactions
                            currentContexts = addContext(currentContexts, storyContext);
                        }
                    }

                    formData.set('newContexts', arrayToString(currentContexts));

                    fetch('./php/dialogflowUpdateContexts.php', {
                        method : 'POST',
                        body : formData
                    }).then(async function(response) {
                        // Check if the fetch gets a correct response
                        if(response.ok) {
                            // Save updated contexts
                            saveContexts(await getDialogflowContexts());
                            
                            // Add bot response to conversation after updating contexts
                            newBotMessage(botResponse);
                        }
                        else {
                            console.log('Error ' + response.status + ': ' + response.statusText);
                        }
                    }).catch(function(err) {
                        console.log('Error fetch: ', err);
                    });
                }
                else {
                    // Save output contexts
                    saveContexts(newContexts);

                    // By default, story interactions are enabled. Check if they are disabled
                    if(!searchActiveContext(newContexts, noStoryContext)) {
                        // Add context to enable story interactions
                        activateContexts(storyContext, result => {
                            // Add bot response to conversation after activating context
                            newBotMessage(botResponse);
                        });
                    }
                    else {
                        // Add bot response to conversation
                        newBotMessage(botResponse);
                    }
                }

            }
            else {
                console.log("Invalid status");
            }
        }).catch(function(err) {
            console.log('Error parse text: ', err);
        });

    }
    else {
        console.log('Error ' + response.status + ': ' + response.statusText);
    }
}

// Create a random string
function getRandomStringID() {
    let id          = "";
    const random    = new Uint8Array(32);
    self.crypto.getRandomValues(random);
    random.forEach(bytes => {id += String(bytes);});
    id              = id.substring(0, 32);

    return id;
}

// Scroll chat to last message
function scrollChat() {
    chat.scrollTop = chat.scrollHeight;
}

// Add user message to the chat
function newUserMessage(text) {
    // Create a new div element for storing user input
    let userMessage = document.createElement('div');
    userMessage.setAttribute('class', 'message user');
    userMessage.innerText = text;
     
    // Add message to the conversation
    chat.appendChild(userMessage);
    
    // Focus new message
    scrollChat();
}

// Add a message to the chat with its characters hidden
function newHiddenUserMessage(text) {
    let hiddenText  = "";
    let count       = 0;

    // Tranform any character into "*"
    while(count < text.length) {
        hiddenText += "*";
        count++;
    }

    newUserMessage(hiddenText);
}

// Control bot interaction, splting responses in messages and sending them in order
function newBotMessage(text) {
    let newMessages = text.split("\\n");
    
    let totalTime = 0;
    for(let i = 0; i<newMessages.length; ++i) {
        // If message includes \t, just make a pause
        if(newMessages[i].includes("\\t")) totalTime += 5000;
        else if(newMessages[i].length > 1){
            // Adds a message that is being written
            typingBotMessage(totalTime);

            // Time of typing message
            let messageTime = newMessages[i].length * 15;
            totalTime += messageTime;

            // Send this message
            addBotMessage(newMessages[i], totalTime);

            // Add time between messages
            totalTime += messageTime + 1000;
        }
    }

    // Enable input again
    if(totalTime > 1000) totalTime -= 1000;
    enableInput(totalTime);

    // Save game if context has been activated
    setTimeout(saveGameProgress, totalTime);

    // Search if game has ended
    if(searchActiveContext(currentContexts, "game_over")) {
        setTimeout(function() {
            // Disable input forever and prevent it from being enabled again
            disableInput();
            clearTimeout(inputHandler);
            resetProgress();
        }, totalTime-10);
    }
}

// Modify last empty message to add a new message to the chat
function addBotMessage(message, time) {
    setTimeout(function() {
        // Search a message beeing typed
        let typedMessage = document.querySelector('div.message.bot.wait');

        if(typedMessage != undefined) {
            // Modify message content
            typedMessage.innerText = message;
            typedMessage.setAttribute('class', 'message bot');
        }
        else {
            // Create a new div element for storing user input
            let botMessage = document.createElement('div');
            botMessage.setAttribute('class', 'message bot');
            botMessage.innerText = message;
            
            // Add message to the conversation
            chat.appendChild(botMessage);
        }

        // Focus new message
        scrollChat();

    }, time);
}

// Add an empty message while bot is "typing"
function typingBotMessage(time) {
    setTimeout(function() {
        // Create a new div element for storing user input
        let botMessage = document.createElement('div');
        botMessage.setAttribute('class', 'message bot wait');
        botMessage.innerText = ". . .";
        
        // Add message to the conversation
        chat.appendChild(botMessage);

        // Focus new message
        scrollChat();
    }, time);
}

// Add an alert message to the chat
function newAlertMessage(message) {
    // Create a new div element for storing user input
    let botMessage = document.createElement('div');
    botMessage.setAttribute('class', 'message alert');
    botMessage.innerText = message;
    
    // Add message to the conversation
    chat.appendChild(botMessage);

    // Focus new message
    scrollChat();
}

// Clear currentContexts array and fill it with new contexts
function saveContexts(newContexts) {
    if(newContexts.length > 0) {
        // Clear current contexts array
        currentContexts = [];

        // Add new contexts
        newContexts.forEach(context => {
            // Check some values before saving it
            let firstChar = context.charAt(0);
            if(firstChar >= 'a' && firstChar <= 'z') {
                if(context.indexOf("fallback") < 0 && context.indexOf("save_game") < 0) {
                    // Save the context in the array
                    currentContexts.push(context);
                }
            }
        });
    }
}

// Remove all messages from the chat
function clearChat() {
    // Search all chat messages
    let messages = document.querySelectorAll('.message');

    // Remove every message
    messages.forEach(m => { m.remove(); });
}

// Check if an element of an array includes a string
function searchActiveContext(contexts, searchName) {
    let value = false;
    contexts.forEach(context => {
        // Check if it is the context being searched
        if(context.includes(searchName)) value = true;
    });

    return value;
}

// Adds a new context, require at least one context activated
function addContext(contexts, newContext) {
    if(contexts.length === 0) return contexts;

    // Get context path
    let newName = "";
    let pos     = contexts[0].lastIndexOf("/");
    if (pos > -1) newName = contexts[0].substring(0, pos+1);

    // Add context name
    newName = newName.concat(newContext);

    // Save it in the contexts container
    contexts.push(newName);

    return contexts;
}

// Remove each element on an array that includes a specific string or the elements that do not include it
function removeContext(array, name, mustInclude) {
    let i = 0;

    while(i < array.length) {
        // Check if the element includes the "name" string
        if(array[i].includes(name) === mustInclude) array.splice(i, 1);
        else                                        i++;
    }

    return array;
}

// Allow users to send messages after some time
function enableInput(time) {
    // If a previous timer exists, stops it
    if(inputHandler != 0) clearTimeout(inputHandler);
    
    // Enable input again after specified time
    inputHandler = setTimeout(function() {
        submitButton.removeAttribute('disabled');
        queryAvailable  = true;
        inputHandler    = 0;
    }, time);
}

// Prevent users from submitting messages
function disableInput() {
    // Disable input and prevent form from being submitted again
    submitButton.setAttribute('disabled', 'disabled');
    queryAvailable = false;

    // Enable after 10 seconds if something goes wrong
    enableInput(10000);
}

// Format an array as a json string
function arrayToString(a) {
    let jsonString = "";

    // Add each element of the array
    a.forEach(element => {
        jsonString = jsonString + ';' + element;
    });

    return jsonString;
}

// Get an array and create a string with the final word (split by /) for saving game contexts
function getContextsForSaving(cont) {
    let string = "";

    // Loop every context
    cont.forEach(c => {
        // Get context name
        let splited = c.split("/");
        
        let addContext = splited[splited.length-1]
        
        // Check if it is a valid context
        if(addContext.charAt(0) < 'a' || addContext.charAt(0) > 'z') return;
        // Check it is not the fallback and save context
        if(addContext === "fallback" || addContext === "save_game") return;
        
        // Appends context to string
        if(string.length > 0) {string += ";"}
        string += addContext;
    });

    return string;
}

// Authentication process, executed after every message when user is not logged in
function authenticationInput() {
    let text = textInput.value;

    disableInput();

    // Check situation
    if(text === "") {
        // Back to init
        logging_in      = false;
        signing_in      = false;
        username        = "";
        updateTypingPasswordStyle(false);
        newBotMessage(TEXTS[RESUME]);
    }
    else {
        if(typingPassword)  newHiddenUserMessage(textInput.value);
        else                newUserMessage(textInput.value);
        
        if(logging_in === true) {
            // User logging in
            if(username === "") {
                // Typing username
                username        = text;
                updateTypingPasswordStyle(true);
                newBotMessage(TEXTS[TYPE_PASSWORD]);
            }
            else {
                // Typing password
                logInUser(text, function(result) {
                    if (result == 0) {
                        // Authentification failed
                        newBotMessage(TEXTS[BAD_LOGIN]);
                    }
                    else if(result == 2) {
                        // Error
                        newBotMessage(TEXTS[ERROR]);
                    }
                });
            }
        }
        else if(signing_in === true) {
            // User signing in
            if(username === "") {
                // Typing username
                if(text.length < 4) {
                    newBotMessage(TEXTS[SHORT_USERNAME]);
                }
                else if(text.length > 31) {
                    newBotMessage(TEXTS[LONG_USERNAME]);
                }
                else {
                    existsUsername(text, function(exists) {
                        if(exists == 0) {
                            // Valid username, type password
                            username        = text;
                            updateTypingPasswordStyle(true);
                            newBotMessage(TEXTS[GOOD_USERNAME]);
                        }
                        else if(exists == 1) {
                            // Username already exists
                            newBotMessage(TEXTS[USERNAME_EXISTS]);
                        }
                        else {
                            // Error
                            newBotMessage(TEXTS[ERROR]);
                        }
                    });
                }
            }
            else {
                // Typing password
                if(text.length < 8) {
                    newBotMessage(TEXTS[SHORT_PASSWORD]);
                }
                else if(text.length > 128) {
                    newBotMessage(TEXTS[LONG_PASSWORD]);
                }
                else {
                    signInUser(text, function(result) {
                        if(result == 1) {
                            // Insertion correct, auto log in
                            logging_in  = true;
                            signing_in  = false;

                            logInUser(text, function(resultLog) {
                                if(resultLog != 1) {
                                    newBotMessage(TEXTS[LOGIN_ERROR]);
                                }
                            });
                        }
                        else {
                            // Error
                            newBotMessage(TEXTS[ERROR]);
                        }
                    });
                }
            }
        }
        else {
            // Deciding to sign in or log in
            text = text.toLowerCase();

            if(text.indexOf("no") >= 0) {
                // Sing in
                signing_in = true;
                newBotMessage(TEXTS[SIGNIN_USERNAME]);
            }
            else if(text.indexOf("si") >= 0) {
                // Log in
                logging_in = true;
                newBotMessage(TEXTS[TYPE_USERNAME]);
            }
            else {
                newBotMessage(TEXTS[RESUME2]);
            }
        }
    }

    // Clean input field
    textInput.value = '';
    updateTypingPasswordStyle(0);
}

// Check if a username exists in the database and then execute a function with the result
function existsUsername(user, fun) {
    // Creates a form data
    formData = new FormData(form);
    formData.set('text', user);

    // Initial result means an error ocurred
    let result = 2; 
                                
    // Send user input to check is the username exists
    fetch('./php/checkUsername.php', {
        method : 'POST',
        body : formData
    }).then(function(response) {
        if(response.ok) {
            response.text().then(function(text) {
                // After getting database response, check if username exists
                if      (text == "t")   result = 1;
                else if (text == "f")   result = 0;

                // Execute function received by parameter
                fun(result);
            }).catch(function(err) {
                console.log('Error parse text: ', err);
            });
        }
        else {
            console.log('Error ' + response.status + ': ' + response.statusText);
        }
    }).catch(function(err) {
        console.log('Error fetch: ', err);
    });
}

// User sign in
function signInUser(password, fun) {
    // Creates a form data
    formData = new FormData(form);
    formData.set('username', username);
    formData.set('password', hashPassword(password));
    formData.set('contexts', initialContexts);

    // Initial result means an error ocurred
    let result = 0; 
                                
    // Send user input to check is the username exists
    fetch('./php/signin.php', {
        method : 'POST',
        body : formData
    }).then(function(response) {
        if(response.ok) {
            response.text().then(function(text) {
                // After getting database response, check if insertion has succeded
                if(text == "1") result = 1;

                // Execute function received by parameter
                fun(result);
            }).catch(function(err) {
                console.log('Error parse text: ', err);
            });
        }
        else {
            console.log('Error ' + response.status + ': ' + response.statusText);
        }
    }).catch(function(err) {
        console.log('Error fetch: ', err);
    });
}

// User log in
function logInUser(password, fun) {
    // Apply hash to password
    user_password = hashPassword(password);

    // Creates a form data
    formData = new FormData(form);
    formData.set('username', username);
    formData.set('password', user_password);

    // Initial result means an error ocurred
    let result = 2; 
                                
    // Send user input to check is the username exists
    fetch('./php/login.php', {
        method : 'POST',
        body : formData
    }).then(function(response) {

        if(response.ok) {
            response.json().then(function(datos) {

                // Save login result
                result = datos.status;
                
                if(datos.status != 0) {
                    // Makes an interaction to start conversation and be able to modify contexts
                    formData = new FormData(form);
                    formData.set('text', "Hola, " + username);
                    formData.set('session', sessionId);
                    formData.set('ccontexts', arrayToString(currentContexts));

                    fetch('./php/dialogflowQuery.php', {
                        method : 'POST',
                        body : formData
                    }).then(async function(queryResponse) {
                        if(queryResponse.ok) {
                            // Activate saved contexts
                            let contextsStatus = await activateContexts(datos.contexts, fun);

                            if(contextsStatus == 1) {
                                // End authentication
                                updateTypingPasswordStyle(false);
                                authentication = true;
            
                                // Display chat saved in the previous conversation with the user
                                clearChat();
                                let previousGameFound = displayPreviousConversation(datos.chat);
                                newAlertMessage(TEXTS[WELCOME1] + username + TEXTS[WELCOME2]);
                                newAlertMessage(TEXTS[INSTRUCTIONS]);

                                if(!previousGameFound) {
                                    // Display instructions and first interaction
                                    disableInput();
                                    newBotMessage(TEXTS[FIRST_MESSAGE]);
                                }
                                else {
                                    // Enable input again
                                    enableInput(1000);
                                }
                            }
                        }
                        
                    }).catch(function(err) {
                        console.log('Error fetch: ', err);
                    });

                }
                else {
                    // Invalid password or username
                    fun(datos.status);
                }
            }).catch(function(err) {
                console.log('Error parse text: ', err);
            });
        }
        else {
            console.log('Error ' + response.status + ': ' + response.statusText);
        }
    }).catch(function(err) {
        console.log('Error fetch: ', err);
    });
}

// Update input classes depending on typingPassword variable
function updateTypingPasswordStyle(newValue) {
    if(newValue === true || newValue === false) typingPassword = newValue;

    // Update textarea style when typing passwords
    if(typingPassword) {
        textInput.setAttribute('class', 'hidePassword');
        passwordField.setAttribute('class', 'passwordField');
    }
    else {
        textInput.setAttribute('class', '');
        passwordField.setAttribute('class', 'passwordField hidePassword');
    }
}

// Apply hash function to a string and return the value
function hashPassword(password) {
    // Apply hash function to password
    let hashPwd = CryptoJS.SHA256(password);
    
    // Convert hash to Base64 encoding
    hashPwd = hashPwd.toString(CryptoJS.enc.Base64);

    return hashPwd;
}

// Activate contexts in Dialogflow session, then execute a function with the response status as a parameter
async function activateContexts(contextsToBeActivated, fun) {
    let finalStatus = 2;

    // Activate saved contexts
    formData = new FormData(form);
    formData.set('session', sessionId);
    formData.set('newContexts', contextsToBeActivated);

    await fetch('./php/dialogflowActivateContexts.php', {
        method : 'POST',
        body : formData
    }).then(async function(contextsResponse) {
        
        // Check if the fetch gets a correct response
        if(contextsResponse.ok) {
            await contextsResponse.json().then(function(datosContexts) {
                // Save active contexts
                currentContexts = currentContexts.concat(datosContexts.activeContexts);

                // Execute function received by parameter
                fun(datosContexts.status);

                finalStatus = datosContexts.status;
            });
        }
        else {
            fun(2);
            console.log('Error ' + contextsResponse.status + ': ' + contextsResponse.statusText);
        }
    }).catch(function(err) {
        console.log('Error fetch: ', err);
    });

    return finalStatus;
}

// If the screen is small enough (mobile size), updates the body size to the screen size
function updateWindowSize() {
    if(window.innerWidth < 500 && window.visualViewport) {
        pageBody.style.height = window.visualViewport.height.toString() + "px";
        document.querySelector('section').style.height = window.visualViewport.height.toString() + "px";
    }
    else {
        pageBody.style.height = "";
        document.querySelector('section').style.height = "";
    }
    
    focusInput();
}

// Scroll input into view
function focusInput() {
    textInput.scrollIntoView(false);
}

// Save player progress in the database if the save variable is active
function saveGameProgress() {
    // Check if has to save game
    if(saveGame === false) return;

    // Update saving status
    saveGame = false;

    // Fill the form with the data required
    formData = new FormData(form);
    formData.set('username', username);
    formData.set('password', user_password);

    // Get contexts
    formData.set('contexts', getContextsForSaving(currentContexts));

    // Get conversation
    formData.set('chat', getLastMessages());

    fetch('./php/saveGame.php', {
        method : 'POST',
        body : formData
    }).then(function(response) {
        // Check if the fetch gets a correct response
        if(response.ok) {
            response.json().then(function(data) {
                if(data.status == 1) {
                    newAlertMessage(TEXTS[GAME_SAVED]);
                }
                else {
                    newAlertMessage(TEXTS[SAVE_ERROR]);
                }
            });
        }
        else {
            console.log('Error ' + response.status + ': ' + response.statusText);
        }
    }).catch(function(err) {
        console.log('Error fetch: ', err);
    });
}

// Clear user's progress saved in database to reset game next time they play
function resetProgress() {
    // Prevent progress to be saved
    saveGame = false;
    
    // Fill the form with the data required
    formData = new FormData(form);
    formData.set('username', username);
    formData.set('password', user_password);

    // Set initial contexts
    formData.set('contexts', initialContexts);

    // Delete conversation
    formData.set('chat', '');

    fetch('./php/saveGame.php', {
        method : 'POST',
        body : formData
    }).then(function(response) {
        // Check if the fetch gets a correct response
        if(response.ok) {
            response.json().then(function(data) {
                if(data.status == 1) {
                    newAlertMessage(TEXTS[GAME_FINISHED]);
                    newAlertMessage(TEXTS[PROGRESS_RESET]);
                }
            });
        }
        else {
            console.log('Error ' + response.status + ': ' + response.statusText);
        }
    }).catch(function(err) {
        console.log('Error fetch: ', err);
    });
}

// Returns last messages of the conversation formatted in a string
function getLastMessages() {
    var lastMessages = "";

    // Get conversation messages
    var messages = chat.querySelectorAll('.message');

    // Save up to 50 messages
    let count           = 0;
    let maxMessages     = 50;
    let valid           = true;
    let index           = messages.length - 1;

    // Save messages loop
    while(valid && index >= 0) {
        let m = messages[index];

        // Check message author
        if(m.classList.contains("bot")) {
            lastMessages = lastMessages.concat("/b", m.innerText);
            count++;
        }
        else if (m.classList.contains("user") && lastMessages.length > 0) {
            lastMessages = lastMessages.concat("/u", m.innerText);
            count++;

            // If reached max messages after saving a user's message, stop
            if(count >= maxMessages) valid = false;
        }

        // Reduce index to check next message
        index--;
    }

    return lastMessages;
}

// Given a formatted string, fill chat with messages
function displayPreviousConversation(messages) {
    // Split string into different messages
    var messageArray = messages.split("/");
    var conversationFound = messageArray.length > 1;

    // Iterate messages in reverse order to add them to the chat
    let index = messageArray.length - 1;

    while(index >= 0) {
        if(messageArray[index].length>1) {
            // Recover message
            let m = messageArray[index];

            if(m.charAt(0) == 'b') {
                // Bot message
                let botMessage = document.createElement('div');
                botMessage.setAttribute('class', 'message bot');
                botMessage.innerText = m.substring(1);
     
                // Add message to the conversation
                chat.appendChild(botMessage);
            }
            else if(m.charAt(0) == 'u'){
                // User message
                let userMessage = document.createElement('div');
                userMessage.setAttribute('class', 'message user');
                userMessage.innerText = m.substring(1);
                
                // Add message to the conversation
                chat.appendChild(userMessage);
            }
        }

        index--;
    }

    return conversationFound;
}

// Get an array of current active contexts in the Dialogflow session
async function getDialogflowContexts() {
    var contexts = [];

    // Specify session id to get contexts from
    formData = new FormData(form);
    formData.set('session', sessionId);

    await fetch('./php/dialogflowGetContexts.php', {
        method : 'POST',
        body : formData
    }).then(async function(contextsResponse) {
        // Check if the fetch gets a correct response
        if(contextsResponse.ok) {
            await contextsResponse.json().then(function(data) {
                // Save contexts
                contexts = data.contexts;
            });
        }
        else {
            console.log('Error ' + contextsResponse.status + ': ' + contextsResponse.statusText);
        }
    }).catch(function(err) {
        console.log('Error fetch: ', err);
    });

    return contexts;
}