$().ready(() => {
    $('#email').change(() => {
        let emailAddress = $('#email').val();
        $.ajax({
            url: `http://localhost:8080/api/v1/exist/email/${emailAddress}`
        }).done(data => {
            let isAvailable = data.result;
            if (isAvailable) {
                $('#email').removeClass('is-valid');
                $('#email').addClass('is-invalid');
            } else {
                $('#email').removeClass('is-invalid');
                $('#email').addClass('is-valid');
            }

            checkIfAllFieldsAreValid();
        });
    });

    $('#username').change(() => {
        let username = $('#username').val();
        $.ajax({
            url: `http://localhost:8080/api/v1/exist/username/${username}`
        }).done(data => {
            let isAvailable = data.result;
            if (isAvailable) {
                $('#username').removeClass('is-valid');
                $('#username').addClass('is-invalid');
            } else {
                $('#username').removeClass('is-invalid');
                $('#username').addClass('is-valid');
            }
            checkIfAllFieldsAreValid();
        });
    });
    $('#password').change(() => {
        let password = $('#password');
        if (password.val().length < 3) {
            password.removeClass('is-valid');
            password.addClass('is-invalid');
        } else {
            password.removeClass('is-invalid');
            password.addClass('is-valid');
        }
        checkIfAllFieldsAreValid();
    });

    $('#repeatPassword').change(() => {
        let password = $('#repeatPassword');
        if (password.val().length < 3 || ($('#password').val() != password.val())) {
            password.removeClass('is-valid');
            password.addClass('is-invalid');
        } else {
            password.removeClass('is-invalid');
            password.addClass('is-valid');
        }
        checkIfAllFieldsAreValid();
    });

    $('#checkbox').change(() => {
        let checkbox = $('#checkbox');
        if (checkbox.prop("checked")) {
            checkbox.removeClass('is-invalid');
            checkbox.addClass('is-valid');
        } else {
            checkbox.removeClass('is-valid');
            checkbox.addClass('is-invalid');
        }
        checkIfAllFieldsAreValid();
    });
});

function checkIfAllFieldsAreValid() {
    let totalIsValid = $(".is-valid");

    if (totalIsValid.length > 4) {
        $('#submitButton').attr('disabled', false);
    } else {
        $('#submitButton').attr('disabled', true);
    }
}