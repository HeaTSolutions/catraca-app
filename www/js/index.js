var app = {
    // Application Constructor
    initialize: function () {
        this.bindEvents();
        //this.api_url = 'http://catracadigital.com.br/api';
        this.api_url = 'http://192.168.0.11:8000/api';
        this.position = null;
        this.registers_objs = [];
    },
    // Bind Event Listeners
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    onDeviceReady: function () {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {
        this.mobileId = device.uuid;
        app.watchPosition();
        $("#mobile_id").html(device.uuid);
        $("#registered").hide();
        $("#not_registered").hide();
        $("#refresh_btn").click(app.loadEmployeeInfo);
        $("#add_report_btn").click(app.addReport);

        app.loadEmployeeInfo();
        app.updateTotalTime();
    },

    onPositionUpdate: function (position) {
        app.position = position;
    },

    onPositionError: function () {
        alert('Não foi possível registrar sua localização. Favor habilitar o serviço de localização.');
    },

    watchPosition: function () {
        var watchID = navigator.geolocation.getCurrentPosition(
            app.onPositionUpdate,
            app.onPositionError,
            {
                enableHighAccuracy: true,
                timeout: 10000
            }
        );

        setTimeout(app.watchPosition, 10000);
    },

    loadEmployeeInfo: function () {
        var employee_info = app.api_url + '/employee/' + app.mobileId;
        $.ajax({
            dataType: 'json',
            url: employee_info,
            data: {},

            success: function (data) {
                $("#employee_name").html(data.full_name + " - " + data.company.name);
                app.loadRegisters();
                $("#registered").show();
                $("#not_registered").hide();
            },

            error: function () {
                alert('Empregado não registrado. Peça ao seu empregrador o registro e tente novamente.');
                $("#not_registered").show();
            }
        });
    },

    loadRegisters: function () {
        var registers_list = app.api_url + '/register/' + app.mobileId + "?period=day";

        $("#registers").html('<ul class="collection center"></ul>');
        $.getJSON(registers_list, {}, function (registers) {

            if (registers.length == 0) {
                $("#empty_register_list").show();
                $("#register_list").hide();
            }
            else {
                $("#empty_register_list").hide();
                $("#register_list").show();

                app.registers_objs = [];
                var labels = ['Entrada: ', 'Saída: '];
                for (var idx in registers) {
                    $("#registers .collection").append(
                        '<li class="collection-item center">' +
                        '   <b>' + labels[idx % 2] + '</b>' +
                        '   <b class="time">' + registers[idx].time.split('T')[1].split('.')[0] + '</b>' +
                        '   <a href="#" data-target="' + registers[idx].pk + '" class="secondary-content">' +
                        '        <i class="material-icons">delete</i>' +
                        '   </a>' +
                        '</li>'
                    );

                    app.registers_objs.push(new Date(registers[idx].time));
                }
            }

            $("li.collection-item a").click(app.removeRegister);
        });
    },

    addReport: function () {
        confirmed = confirm('Você deseja fazer uma marcação agora?');
        if (confirmed) {
            var register_url = app.api_url + "/register/" + app.mobileId;

            var data = {
                latitude: app.position.coords.latitude,
                longitude: app.position.coords.longitude
            };

            $.post(register_url, data, function (response) {
                Materialize.toast('Marcação feita!', 4000);
                app.loadRegisters();
            });
        }
    },

    removeRegister: function () {
        var registerTime = $(this).parent().find('b.time').html();
        var confirmed = confirm("Deseja remover o registro de" + registerTime + "?");
        if (confirmed) {
            var pk = $(this).attr('data-target');
            var register_url = app.api_url + "/delete_register/" + pk;
            $.ajax({
                url: register_url,
                method: 'DELETE',
                success: function (data) {
                    Materialize.toast('Marcação removida!', 4000);
                    app.loadRegisters();
                }
            });
        }
    },

    updateTotalTime: function () {
        var addedNow = false;
        if (app.registers_objs.length % 2 == 1) {
            var now = new Date();
            now.setHours(now.getHours() - 3);
            app.registers_objs.push(now);
            addedNow = true;
        }

        if (app.registers_objs.length == 1) {
            app.registers_objs.pop();
        }

        var sum = 0;
        for (var i = 1; i < app.registers_objs.length; i += 2) {
            sum += (app.registers_objs[i] - app.registers_objs[i - 1]);
        }

        if ($("#registers li").length != 0) {
            $("#totalTimeZero").hide();
            $("#totalTime").html(app.getDuration(sum));
            $("#totalTime").show();
        } else {
            $("#totalTime").hide();
            $("#totalTimeZero").show();
        }

        if (addedNow) {
            app.registers_objs.pop();
        }

        setTimeout(app.updateTotalTime, 1000);
    },

    getDuration: function (millis) {
        var seconds = Math.floor(millis / 1000);
        var minutes = Math.floor(seconds / 60);
        seconds %= 60;
        var hours = Math.floor(minutes / 60);
        minutes %= 60;

        if (seconds < 10) {
            seconds = "0" + seconds;
        }

        if (minutes < 10) {
            minutes = "0" + minutes;
        }

        if (hours < 10) {
            hours = "0" + hours;
        }

        return hours + ":" + minutes + ":" + seconds;
    }

};
