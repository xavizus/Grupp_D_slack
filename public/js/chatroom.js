$(function () {
    var socket = io();
    console.log(target);

    // when user connects
    socket.on('connect', () => {
        if (target == '') {
            socket.emit('user-connected', roomName, currentUser, socket.id, userId);
        } else {
            socket.emit('user-connected-private', target, currentUser, socket.id, userId);
        }
    });

    // create chat room input form
    $('#createChatRoom').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data about new chat room to server
        socket.emit('create-chat-room', {
            roomname: $('#newRoomName').val(),
            members: []
        });

        socket.on('create-status', (msg) => {
            alert(msg);
        });
    });

    // message input form
    $('#sendMessage').submit(function (e) {
        // prevents page reloading
        e.preventDefault();

        // sends data to server
        if (target == '') {
            socket.emit('chat message', roomName, {
                'userid': userId,
                'message': $('#m').val()
            });
        } else {
            socket.emit('private message', target, {
                'userid': userId,
                'message': $('#m').val()
            });
        }
        // clears input box
        $('#m').val('');
        return false;
    });

    // receives message from server and prints it in the chat
    socket.on('chat message', function (user, message, messageID, picturePath) {
        let messageBox = $('<li>', {
            id: messageID
        });

        let imgContainer = $('<div>', {
            class: 'imgContainer'
        });

        let profilePic = $('<img>', {
            src: picturePath,
            alt: 'profile picture',
            class: 'profilePictureChat'
        });
        imgContainer.append(profilePic)

        let usernameLink = $('<a>', {
            href: '/profile/' + user,
            text: user
        });

        let chatMessage = $('<div>', {
            text: message,
            class : 'messageDiv'
        });

        let editButton = $('<button>', {
            class: "far fa-edit edit-buttons"
        });

        function edit(event) {
            let messageDiv = event.currentTarget.previousSibling.previousSibling;
            let oldMessage = messageDiv.innerHTML;

            let editArea = $('<textarea>', {
                html: oldMessage,
                class: 'editArea'
            });

            let saveButton = $('<button>', {
                text: 'Save',
                class: 'btn-info'
            });

            saveButton.on('click', (event) => {
                if (target == '') {
                    socket.emit('edit-message', editArea.val(), event.currentTarget.parentNode.parentNode.id, '');
                } else {
                    socket.emit('edit-message', editArea.val(), event.currentTarget.parentNode.parentNode.id, 'private-');
                }

                $(messageDiv).html(editArea.val());
            });

            let closeButton = $('<button>', {
                text: 'Close',
                class: 'btn-danger'
            });

            closeButton.on('click', (event) => {
                $(messageDiv).html(oldMessage);
            });

            $(messageDiv).empty();
            $(messageDiv)
                .append(editArea)
                .append(saveButton)
                .append(closeButton);


            editButton.off().on('click', (event) => {
                $(messageDiv).html(oldMessage);
                editButton.off().on('click', edit);
            });
        }

        editButton.on('click', edit);

        let deleteButton = $('<button>', {
            class: 'delete-buttons far fa-trash-alt'
        });

        deleteButton.on('click', (event) => {
            if (target == '') {
                socket.emit('delete-message', event.currentTarget.parentNode.id, '');
            } else {
                socket.emit('delete-message', event.currentTarget.parentNode.id, 'private-');
            }

            event.currentTarget.parentNode.nextSibling.remove()
            event.currentTarget.parentNode.remove();
        });

        if (user == currentUser) {
            messageBox
                .append(imgContainer)
                .append(usernameLink)
                .append(deleteButton)
                .append(editButton)
                .append(chatMessage)
                ;
            $('#messages').append(messageBox);
        } else {
            messageBox
                .append(imgContainer)
                .append(usernameLink)
                .append(chatMessage);
            $('#messages').append(messageBox);
        }
        $('#messages').append($('<hr class="test">'));
        $("#chat-container").scrollTop($("#chat-container")[0].scrollHeight);
    });

    // Update statuses for users
    socket.on('status-change', (userId, userName, status) => {
        console.log(`UserID: ${userId} changed status to: ${status}`);
        let cssStatus = '';
        let message = ''
        if (status == 'Online') {
            cssStatus = 'text-success';
            message = `User <span class="font-weight-bolder underline">${userName}</span> has connected!`;
        } else {
            cssStatus = 'text-secondary';
            message = `User <span class="font-weight-bolder underline">${userName}</span> has disconnected!`;
        }
        $(`.${userId}`).removeClass('text-secondary','text-success');
        $(`.${userId}`).addClass(cssStatus);

        $('#messages').append(`<li>${message}</li> <hr class="test">`);
    });

});