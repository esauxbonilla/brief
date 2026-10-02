-- "Extra": una tarea libre para el cliente (no es contenido); él solo marca "Hecho".
alter type channel add value if not exists 'extra';
