web: python manage.py migrate --noinput && python manage.py create_turmas_corretas && python manage.py collectstatic --noinput && daphne -b 0.0.0.0 -p $PORT johnny_lms.asgi:application
