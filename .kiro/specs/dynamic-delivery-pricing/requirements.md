# Documento de Requisitos: Tarificación Dinámica de Envío por Distancia

## Introducción

Este documento define los requisitos para implementar un sistema de tarificación dinámica de envío basado en la distancia entre la tienda y la dirección del cliente. El sistema extiende la funcionalidad existente de zonas de entrega (polígonos) con un modelo de precios basado en radio: si el cliente está dentro del radio base configurado, se aplica la tarifa base; si está fuera del radio pero dentro de la distancia máxima permitida, se calcula un cargo adicional proporcional a los kilómetros excedentes. Los administradores pueden configurar todos los parámetros desde el panel de administración, y el cliente ve el desglose completo del cálculo durante el checkout.

## Glosario

- **Sistema_Admin**: Panel de administración de la tienda de patinaje (`/admin`)
- **Sistema_Tienda**: Interfaz de la tienda para clientes (`/skating-store`)
- **Calculadora_Envío**: Módulo de lógica de negocio que calcula el costo de envío basado en distancia
- **Radio_Base**: Distancia en kilómetros desde la tienda dentro de la cual se aplica la tarifa base sin recargo
- **Tarifa_Base**: Costo fijo de envío que se aplica cuando el cliente está dentro del Radio_Base
- **Costo_Km_Adicional**: Monto que se cobra por cada kilómetro que excede el Radio_Base
- **Distancia_Máxima**: Distancia máxima en kilómetros desde la tienda hasta la cual se permiten envíos
- **Kilómetros_Excedentes**: Diferencia entre la distancia real al cliente y el Radio_Base, cuando la distancia real es mayor
- **Haversine**: Fórmula matemática para calcular la distancia entre dos puntos geográficos sobre la superficie terrestre
- **Configuración_Envío**: Conjunto de parámetros que definen las reglas de tarificación (Radio_Base, Tarifa_Base, Costo_Km_Adicional, Distancia_Máxima, habilitación de envíos fuera de zona)

## Requisitos

### Requisito 1: Cálculo de distancia entre la tienda y el cliente

**Historia de Usuario:** Como sistema, quiero calcular automáticamente la distancia entre la ubicación de la tienda y la dirección del cliente, para determinar el costo de envío correspondiente.

#### Criterios de Aceptación

1. WHEN se proporciona la dirección del cliente durante el checkout, THE Calculadora_Envío SHALL calcular la distancia en kilómetros entre la ubicación de la tienda y las coordenadas del cliente usando la fórmula Haversine
2. THE Calculadora_Envío SHALL utilizar la ubicación de la tienda almacenada en la configuración existente (`store-location` en `static_content`) como punto de origen para el cálculo
3. IF las coordenadas del cliente no están disponibles o son inválidas, THEN THE Calculadora_Envío SHALL retornar un error descriptivo indicando que no se puede calcular la distancia

### Requisito 2: Comparación de distancia con el radio base

**Historia de Usuario:** Como sistema, quiero comparar la distancia calculada con el radio base configurado, para determinar si se aplica la tarifa base o un recargo adicional.

#### Criterios de Aceptación

1. WHEN la distancia calculada es menor o igual al Radio_Base, THE Calculadora_Envío SHALL clasificar el envío como "dentro de zona" y aplicar únicamente la Tarifa_Base
2. WHEN la distancia calculada es mayor que el Radio_Base y menor o igual a la Distancia_Máxima, THE Calculadora_Envío SHALL clasificar el envío como "fuera de zona" y calcular el recargo adicional
3. WHEN la distancia calculada es mayor que la Distancia_Máxima, THE Calculadora_Envío SHALL clasificar el envío como "fuera de alcance"

### Requisito 3: Cálculo del costo de envío con recargo por distancia

**Historia de Usuario:** Como cliente, quiero que el sistema calcule automáticamente el costo de envío incluyendo cualquier recargo por distancia, para conocer el costo total antes de confirmar mi pedido.

#### Criterios de Aceptación

1. WHEN el envío se clasifica como "dentro de zona", THE Calculadora_Envío SHALL retornar la Tarifa_Base como costo total de envío
2. WHEN el envío se clasifica como "fuera de zona", THE Calculadora_Envío SHALL calcular los Kilómetros_Excedentes como la diferencia entre la distancia real y el Radio_Base
3. WHEN el envío se clasifica como "fuera de zona", THE Calculadora_Envío SHALL calcular el costo total como: Tarifa_Base + (Kilómetros_Excedentes × Costo_Km_Adicional)
4. THE Calculadora_Envío SHALL redondear los Kilómetros_Excedentes a dos decimales antes de calcular el recargo
5. THE Calculadora_Envío SHALL retornar el costo total de envío como un valor numérico no negativo

### Requisito 4: Configuración de parámetros de tarificación desde el panel admin

**Historia de Usuario:** Como administrador, quiero configurar los parámetros de tarificación de envío desde el panel de administración, para ajustar las tarifas según las necesidades del negocio.

#### Criterios de Aceptación

1. THE Sistema_Admin SHALL proporcionar un formulario para configurar: Radio_Base (en kilómetros), Tarifa_Base (en moneda local), Costo_Km_Adicional (en moneda local), Distancia_Máxima (en kilómetros), y un toggle para habilitar o deshabilitar envíos fuera de zona
2. WHEN un administrador guarda la Configuración_Envío, THE Sistema_Admin SHALL persistir los valores en la base de datos
3. WHEN un administrador carga la página de configuración de envío, THE Sistema_Admin SHALL mostrar los valores actuales almacenados en la base de datos
4. IF un administrador ingresa un valor negativo para Radio_Base, Tarifa_Base, Costo_Km_Adicional o Distancia_Máxima, THEN THE Sistema_Admin SHALL rechazar la entrada y mostrar un mensaje de error
5. IF un administrador ingresa una Distancia_Máxima menor o igual al Radio_Base, THEN THE Sistema_Admin SHALL rechazar la entrada e indicar que la distancia máxima debe ser mayor al radio base
6. WHEN un administrador guarda la Configuración_Envío y luego la consulta, THE Sistema_Admin SHALL retornar los mismos valores guardados

### Requisito 5: Bloqueo de pedidos fuera de la distancia máxima

**Historia de Usuario:** Como tienda, quiero bloquear pedidos que excedan la distancia máxima permitida, para no aceptar envíos que no puedo cumplir.

#### Criterios de Aceptación

1. WHEN la distancia al cliente excede la Distancia_Máxima, THE Sistema_Tienda SHALL impedir la finalización del pedido
2. WHEN el pedido es bloqueado por exceder la Distancia_Máxima, THE Sistema_Tienda SHALL mostrar un mensaje informativo indicando que la dirección está fuera del alcance de entrega y la distancia máxima permitida
3. WHILE los envíos fuera de zona están deshabilitados en la Configuración_Envío, THE Sistema_Tienda SHALL bloquear pedidos cuya distancia exceda el Radio_Base y mostrar un mensaje indicando que la dirección está fuera de la zona de cobertura

### Requisito 6: Visualización del desglose de envío en el checkout

**Historia de Usuario:** Como cliente, quiero ver el desglose detallado del cálculo de envío durante el checkout, para entender cómo se compone el costo de envío.

#### Criterios de Aceptación

1. WHEN el envío se clasifica como "dentro de zona", THE Sistema_Tienda SHALL mostrar la distancia calculada y la Tarifa_Base como costo de envío
2. WHEN el envío se clasifica como "fuera de zona", THE Sistema_Tienda SHALL mostrar: la distancia total calculada, el Radio_Base, los Kilómetros_Excedentes, la Tarifa_Base, el recargo por kilómetros adicionales, y el costo total de envío
3. WHEN la dirección del cliente cambia durante el checkout, THE Sistema_Tienda SHALL recalcular y actualizar el desglose de envío
4. THE Sistema_Tienda SHALL mostrar los valores monetarios con formato de moneda local y las distancias en kilómetros con dos decimales

### Requisito 7: Visualización del radio de cobertura en el mapa del admin

**Historia de Usuario:** Como administrador, quiero ver el radio base y la distancia máxima representados visualmente en el mapa, para entender el alcance geográfico de las tarifas configuradas.

#### Criterios de Aceptación

1. WHEN la Configuración_Envío está definida, THE Sistema_Admin SHALL renderizar un círculo en el mapa centrado en la ubicación de la tienda con radio igual al Radio_Base
2. WHEN la Configuración_Envío incluye Distancia_Máxima, THE Sistema_Admin SHALL renderizar un segundo círculo en el mapa centrado en la ubicación de la tienda con radio igual a la Distancia_Máxima
3. THE Sistema_Admin SHALL diferenciar visualmente ambos círculos usando colores distintos (verde para Radio_Base, naranja para Distancia_Máxima)
4. WHEN los valores de Radio_Base o Distancia_Máxima cambian en el formulario, THE Sistema_Admin SHALL actualizar los círculos en el mapa en tiempo real
