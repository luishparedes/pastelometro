document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let ingredients = JSON.parse(localStorage.getItem('ingredients')) || [];
    let recipes = JSON.parse(localStorage.getItem('recipes')) || [];
    let sales = JSON.parse(localStorage.getItem('sales')) || [];
    let businessName = localStorage.getItem('businessName') || 'PASTELOMETRO';
    
    // Elementos del DOM
    const businessNameElement = document.getElementById('business-name');
    const businessNameInput = document.getElementById('business-name-input');
    const saveBusinessNameBtn = document.getElementById('save-business-name');
    
    // Inicializar la aplicación
    init();
    
    // Funciones de inicialización
    function init() {
        updateBusinessName();
        loadIngredients();
        loadRecipes();
        loadSales();
        setupEventListeners();
        updateIngredientDropdowns();
    }
    
    function updateBusinessName() {
        businessNameElement.textContent = businessName;
        businessNameInput.value = businessName;
    }
    
    function setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(this.dataset.tab).classList.add('active');
            });
        });
        
        // Ingredientes
        document.getElementById('add-ingredient').addEventListener('click', addIngredient);
        
        // Recetas
        document.getElementById('add-more-ingredients').addEventListener('click', addMoreIngredients);
        document.getElementById('save-recipe').addEventListener('click', saveRecipe);
        
        // Ventas
        document.getElementById('generate-sale').addEventListener('click', () => generateSale(false));
        document.getElementById('generate-presupuesto').addEventListener('click', () => generateSale(true));
        document.getElementById('copy-receipt').addEventListener('click', copyReceipt);
        document.getElementById('share-receipt').addEventListener('click', shareReceipt);
        
        // Configuración
        saveBusinessNameBtn.addEventListener('click', saveBusinessName);
        document.getElementById('export-data').addEventListener('click', exportData);
        document.getElementById('import-data-btn').addEventListener('click', importData);
        document.getElementById('reset-data').addEventListener('click', resetData);
        
        // Tipo de venta
        document.getElementById('sale-type').addEventListener('change', function() {
            document.getElementById('portion-quantity-container').style.display = 
                this.value === 'portion' ? 'block' : 'none';
        });
    }
    
    // Funciones de ingredientes
    function addIngredient() {
        const name = document.getElementById('ingredient-name').value.trim();
        const price = parseFloat(document.getElementById('ingredient-price').value);
        const quantity = parseFloat(document.getElementById('ingredient-quantity').value);
        const unit = document.getElementById('ingredient-unit').value;
        
        if (!name || isNaN(price) || isNaN(quantity)) {
            alert('Por favor complete todos los campos correctamente');
            return;
        }
        
        // Calcular precio por unidad (gramo, ml, unidad, etc.)
        const unitPrice = price / quantity;
        
        const ingredient = {
            id: Date.now(),
            name,
            price,
            quantity,
            unit,
            unitPrice
        };
        
        ingredients.push(ingredient);
        saveIngredients();
        
        // Limpiar formulario
        document.getElementById('ingredient-name').value = '';
        document.getElementById('ingredient-price').value = '';
        document.getElementById('ingredient-quantity').value = '';
        
        loadIngredients();
        updateIngredientDropdowns();
    }
    
    function loadIngredients() {
        const tbody = document.getElementById('ingredients-list');
        tbody.innerHTML = '';
        
        if (ingredients.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hay ingredientes registrados</td></tr>';
            return;
        }
        
        ingredients.forEach(ingredient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ingredient.name}</td>
                <td>$${ingredient.price.toFixed(2)}</td>
                <td>${ingredient.quantity} ${ingredient.unit}</td>
                <td>$${ingredient.unitPrice.toFixed(6)}/${ingredient.unit}</td>
                <td>
                    <button onclick="editIngredient(${ingredient.id})">Editar</button>
                    <button onclick="deleteIngredient(${ingredient.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    function updateIngredientDropdowns() {
        const dropdowns = document.querySelectorAll('.recipe-ingredient, #sale-recipe');
        
        dropdowns.forEach(dropdown => {
            const currentValue = dropdown.value;
            dropdown.innerHTML = dropdown.id === 'sale-recipe' 
                ? '<option value="">Seleccionar receta</option>'
                : '<option value="">Seleccionar</option>';
            
            if (dropdown.id === 'sale-recipe') {
                recipes.forEach(recipe => {
                    const option = document.createElement('option');
                    option.value = recipe.id;
                    option.textContent = recipe.name;
                    dropdown.appendChild(option);
                });
            } else {
                ingredients.forEach(ingredient => {
                    const option = document.createElement('option');
                    option.value = ingredient.id;
                    option.textContent = `${ingredient.name} ($${ingredient.unitPrice.toFixed(6)}/${ingredient.unit})`;
                    dropdown.appendChild(option);
                });
            }
            
            // Restaurar el valor seleccionado si existe
            if (currentValue && Array.from(dropdown.options).some(opt => opt.value === currentValue)) {
                dropdown.value = currentValue;
            }
        });
    }
    
    function saveIngredients() {
        localStorage.setItem('ingredients', JSON.stringify(ingredients));
    }
    
    // Funciones de recetas
    function addMoreIngredients() {
        const container = document.getElementById('recipe-ingredients');
        const newRow = document.createElement('div');
        newRow.className = 'ingredient-row';
        newRow.innerHTML = `
            <div class="grid">
                <div class="form-group">
                    <label>Ingrediente</label>
                    <select class="recipe-ingredient">
                        <option value="">Seleccionar</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Cantidad</label>
                    <input type="number" class="recipe-quantity" step="0.01">
                </div>
            </div>
        `;
        container.appendChild(newRow);
        updateIngredientDropdowns();
    }
    
    function saveRecipe() {
        const name = document.getElementById('recipe-name').value.trim();
        const portions = parseInt(document.getElementById('recipe-portions').value);
        const profit = parseFloat(document.getElementById('recipe-profit').value);
        const depreciation = parseFloat(document.getElementById('recipe-depreciation').value);
        const labor = parseFloat(document.getElementById('recipe-labor').value);
        const additional = parseFloat(document.getElementById('recipe-additional').value) || 0;
        
        if (!name || isNaN(portions) || isNaN(profit) || isNaN(depreciation) || isNaN(labor)) {
            alert('Por favor complete todos los campos correctamente');
            return;
        }
        
        // Obtener ingredientes de la receta
        const ingredientRows = document.querySelectorAll('.ingredient-row');
        const recipeIngredients = [];
        let totalCost = 0;
        
        ingredientRows.forEach(row => {
            const ingredientId = parseInt(row.querySelector('.recipe-ingredient').value);
            const quantity = parseFloat(row.querySelector('.recipe-quantity').value);
            
            if (ingredientId && !isNaN(quantity)) {
                const ingredient = ingredients.find(i => i.id === ingredientId);
                if (ingredient) {
                    // Calcular costo: precio por unidad * cantidad usada
                    const cost = quantity * ingredient.unitPrice;
                    totalCost += cost;
                    
                    recipeIngredients.push({
                        ingredientId,
                        name: ingredient.name,
                        quantity,
                        unit: ingredient.unit,
                        cost
                    });
                }
            }
        });
        
        if (recipeIngredients.length === 0) {
            alert('Debe agregar al menos un ingrediente a la receta');
            return;
        }
        
        // Calcular costos adicionales (porcentajes)
        const depreciationCost = totalCost * (depreciation / 100);
        const laborCost = totalCost * (labor / 100);
        
        // Costo total con adicionales
        const totalWithAdditional = totalCost + depreciationCost + laborCost + additional;
        
        // Calcular precio de venta: costo / (1 - %ganancia/100)
        const salePrice = totalWithAdditional / (1 - (profit / 100));
        
        // Precio por porción
        const portionPrice = salePrice / portions;
        
        const recipe = {
            id: Date.now(),
            name,
            portions,
            profit,
            depreciation,
            labor,
            additional,
            ingredients: recipeIngredients,
            totalCost,
            depreciationCost,
            laborCost,
            totalWithAdditional,
            salePrice,
            portionPrice,
            createdAt: new Date().toISOString()
        };
        
        recipes.push(recipe);
        saveRecipes();
        
        // Limpiar formulario
        document.getElementById('recipe-name').value = '';
        document.getElementById('recipe-portions').value = '1';
        document.getElementById('recipe-profit').value = '30';
        document.getElementById('recipe-depreciation').value = '5';
        document.getElementById('recipe-labor').value = '12';
        document.getElementById('recipe-additional').value = '0';
        
        const ingredientsContainer = document.getElementById('recipe-ingredients');
        ingredientsContainer.innerHTML = `
            <h3>Ingredientes</h3>
            <div class="ingredient-row">
                <div class="grid">
                    <div class="form-group">
                        <label>Ingrediente</label>
                        <select class="recipe-ingredient">
                            <option value="">Seleccionar</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Cantidad</label>
                        <input type="number" class="recipe-quantity" step="0.01">
                    </div>
                </div>
            </div>
        `;
        
        loadRecipes();
        updateIngredientDropdowns();
    }
    
    function loadRecipes() {
        const tbody = document.getElementById('recipes-list');
        tbody.innerHTML = '';
        
        if (recipes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hay recetas registradas</td></tr>';
            return;
        }
        
        recipes.forEach(recipe => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${recipe.name}</td>
                <td>$${recipe.totalWithAdditional.toFixed(2)}</td>
                <td>$${recipe.salePrice.toFixed(2)}</td>
                <td>${recipe.portions}</td>
                <td>$${recipe.portionPrice.toFixed(2)}</td>
                <td>
                    <button onclick="viewRecipeDetails(${recipe.id})">Ver</button>
                    <button onclick="editRecipe(${recipe.id})">Editar</button>
                    <button onclick="deleteRecipe(${recipe.id})">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    function saveRecipes() {
        localStorage.setItem('recipes', JSON.stringify(recipes));
    }
    
    // Funciones de ventas
    function generateSale(isPresupuesto = false) {
        const recipeId = parseInt(document.getElementById('sale-recipe').value);
        const saleType = document.getElementById('sale-type').value;
        const portionQuantity = parseInt(document.getElementById('portion-quantity').value) || 1;
        const exchangeRate = parseFloat(document.getElementById('exchange-rate').value) || 77.00;
        
        if (!recipeId) {
            alert('Por favor seleccione una receta');
            return;
        }
        
        const recipe = recipes.find(r => r.id === recipeId);
        if (!recipe) return;
        
        let total, quantityText;
        
        if (saleType === 'portion') {
            total = recipe.portionPrice * portionQuantity;
            quantityText = `${portionQuantity} porción(es)`;
        } else {
            total = recipe.salePrice;
            quantityText = '1 pastel completo';
        }
        
        const totalBs = total * exchangeRate;
        
        if (!isPresupuesto) {
            const sale = {
                id: Date.now(),
                recipeId,
                recipeName: recipe.name,
                saleType,
                quantity: saleType === 'portion' ? portionQuantity : 1,
                total,
                totalBs,
                exchangeRate,
                date: new Date().toISOString()
            };
            
            sales.push(sale);
            saveSales();
            loadSales();
        }
        
        // Generar recibo
        generateReceipt({
            recipeName: recipe.name,
            saleType,
            quantity: saleType === 'portion' ? portionQuantity : 1,
            total,
            totalBs,
            exchangeRate
        }, recipe, isPresupuesto);
        
        // Mostrar recibo
        document.getElementById('receipt-container').classList.remove('hidden');
    }
    
    function generateReceipt(sale, recipe, isPresupuesto = false) {
        const receiptBusinessName = document.getElementById('receipt-business-name');
        const receiptType = document.getElementById('receipt-type');
        const receiptContent = document.getElementById('receipt-content');
        
        receiptBusinessName.textContent = businessName;
        receiptType.textContent = isPresupuesto ? 'Presupuesto' : 'Recibo de Venta';
        
        let html = `
            <div class="receipt-item">
                <span>Receta:</span>
                <span>${recipe.name}</span>
            </div>
            <div class="receipt-item">
                <span>Tipo:</span>
                <span>${sale.saleType === 'portion' ? 'Por porción' : 'Pastel completo'}</span>
            </div>
            <div class="receipt-item">
                <span>Cantidad:</span>
                <span>${sale.saleType === 'portion' ? sale.quantity + ' porción(es)' : '1 unidad'}</span>
            </div>
            <div class="receipt-item">
                <span>Fecha:</span>
                <span>${new Date().toLocaleString()}</span>
            </div>
            <div class="receipt-item receipt-total">
                <span>Total ($):</span>
                <span>$${sale.total.toFixed(2)}</span>
            </div>
            <div class="receipt-item">
                <span>Total (Bs):</span>
                <span>${sale.totalBs.toFixed(2)} Bs</span>
            </div>
            <div class="receipt-item">
                <span>Tasa de cambio:</span>
                <span>1$ = ${sale.exchangeRate.toFixed(2)} Bs</span>
            </div>
        `;
        
        if (isPresupuesto) {
            html += `
                <div class="receipt-note">
                    <p><em>Este es un presupuesto, no una venta registrada.</em></p>
                </div>
            `;
        }
        
        receiptContent.innerHTML = html;
    }
    
    function copyReceipt() {
        const receipt = document.getElementById('receipt');
        const range = document.createRange();
        range.selectNode(receipt);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        alert('Recibo copiado al portapapeles');
    }
    
    function shareReceipt() {
        if (navigator.share) {
            const receipt = document.getElementById('receipt');
            navigator.share({
                title: `Recibo de ${businessName}`,
                text: `Detalles de la venta de ${businessName}`,
                url: window.location.href
            }).catch(err => {
                console.error('Error al compartir:', err);
                alert('No se pudo compartir el recibo. Puede copiarlo manualmente.');
            });
        } else {
            alert('La función de compartir no está disponible en este navegador. Puede copiar el recibo manualmente.');
        }
    }
    
    function loadSales() {
        const tbody = document.getElementById('sales-list');
        tbody.innerHTML = '';
        
        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No hay ventas registradas</td></tr>';
            return;
        }
        
        // Calcular totales
        let totalSales = 0;
        let totalSalesBs = 0;
        
        sales.forEach(sale => {
            const date = new Date(sale.date);
            const formattedDate = date.toLocaleDateString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${sale.recipeName}</td>
                <td>${sale.saleType === 'portion' ? 'Porción' : 'Completo'}</td>
                <td>${sale.quantity}</td>
                <td>$${sale.total.toFixed(2)}</td>
                <td>${sale.totalBs.toFixed(2)} Bs</td>
                <td><button class="delete-sale-btn" onclick="deleteSale(${sale.id})">Eliminar</button></td>
            `;
            tbody.appendChild(row);
            
            totalSales += sale.total;
            totalSalesBs += sale.totalBs;
        });
        
        // Agregar fila de totales
        const totalsRow = document.createElement('tr');
        totalsRow.style.fontWeight = 'bold';
        totalsRow.innerHTML = `
            <td colspan="4">TOTALES</td>
            <td>$${totalSales.toFixed(2)}</td>
            <td>${totalSalesBs.toFixed(2)} Bs</td>
            <td></td>
        `;
        tbody.appendChild(totalsRow);
    }
    
    function saveSales() {
        localStorage.setItem('sales', JSON.stringify(sales));
    }
    
    // Funciones de configuración
    function saveBusinessName() {
        const newName = businessNameInput.value.trim();
        if (newName) {
            businessName = newName;
            localStorage.setItem('businessName', businessName);
            updateBusinessName();
            alert('Nombre del negocio actualizado');
        } else {
            alert('Por favor ingrese un nombre válido');
        }
    }
    
    function exportData() {
        const data = {
            ingredients,
            recipes,
            sales,
            businessName
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pastelometro_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    function importData() {
        const fileInput = document.getElementById('import-data');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Por favor seleccione un archivo para importar');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('¿Está seguro que desea importar estos datos? Se sobrescribirán los datos actuales.')) {
                    ingredients = data.ingredients || [];
                    recipes = data.recipes || [];
                    sales = data.sales || [];
                    businessName = data.businessName || 'PASTELOMETRO';
                    
                    saveIngredients();
                    saveRecipes();
                    saveSales();
                    localStorage.setItem('businessName', businessName);
                    
                    init();
                    alert('Datos importados correctamente');
                }
            } catch (error) {
                console.error('Error al importar datos:', error);
                alert('Error al importar datos. El archivo puede estar corrupto o en un formato incorrecto.');
            }
        };
        reader.readAsText(file);
    }
    
    function resetData() {
        if (confirm('¿Está seguro que desea eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
            localStorage.clear();
            ingredients = [];
            recipes = [];
            sales = [];
            businessName = 'PASTELOMETRO';
            
            init();
            alert('Todos los datos han sido restablecidos');
        }
    }
    
    // Funciones globales para botones
    window.editIngredient = function(id) {
        const ingredient = ingredients.find(i => i.id === id);
        if (!ingredient) return;
        
        const newName = prompt('Nombre del ingrediente:', ingredient.name);
        if (newName === null) return;
        
        const newPrice = parseFloat(prompt('Precio:', ingredient.price));
        if (isNaN(newPrice)) return;
        
        const newQuantity = parseFloat(prompt('Cantidad:', ingredient.quantity));
        if (isNaN(newQuantity)) return;
        
        const newUnit = prompt('Unidad de medida (g, kg, ml, l, unidades):', ingredient.unit);
        if (!newUnit) return;
        
        ingredient.name = newName.trim();
        ingredient.price = newPrice;
        ingredient.quantity = newQuantity;
        ingredient.unit = newUnit;
        ingredient.unitPrice = newPrice / newQuantity;
        
        saveIngredients();
        loadIngredients();
        updateIngredientDropdowns();
    };
    
    window.deleteIngredient = function(id) {
        if (confirm('¿Está seguro que desea eliminar este ingrediente?')) {
            ingredients = ingredients.filter(i => i.id !== id);
            saveIngredients();
            loadIngredients();
            updateIngredientDropdowns();
        }
    };
    
    window.viewRecipeDetails = function(id) {
        const recipe = recipes.find(r => r.id === id);
        if (!recipe) return;
        
        let html = `
            <h3>${recipe.name}</h3>
            <p><strong>Porciones:</strong> ${recipe.portions}</p>
            <p><strong>Costo total:</strong> $${recipe.totalWithAdditional.toFixed(2)}</p>
            <p><strong>Precio de venta:</strong> $${recipe.salePrice.toFixed(2)}</p>
            <p><strong>Precio por porción:</strong> $${recipe.portionPrice.toFixed(2)}</p>
            
            <h4>Ingredientes:</h4>
            <ul>
        `;
        
        recipe.ingredients.forEach(ing => {
            html += `
                <li>${ing.quantity} ${ing.unit} de ${ing.name} - $${ing.cost.toFixed(2)}</li>
            `;
        });
        
        html += `
            </ul>
            
            <h4>Costos adicionales:</h4>
            <ul>
                <li>Depreciación (${recipe.depreciation}%): $${recipe.depreciationCost.toFixed(2)}</li>
                <li>Mano de obra (${recipe.labor}%): $${recipe.laborCost.toFixed(2)}</li>
                <li>Otros costos: $${recipe.additional.toFixed(2)}</li>
            </ul>
            
            <p><strong>Margen de ganancia:</strong> ${recipe.profit}%</p>
            <p><strong>Fecha de creación:</strong> ${new Date(recipe.createdAt).toLocaleDateString()}</p>
        `;
        
        alert(html.replace(/<[^>]*>/g, '')); // Versión simplificada para el alert
        
        // Aquí podríamos implementar un modal más bonito en lugar de usar alert
    };
    
    window.editRecipe = function(id) {
        alert('Función de edición de receta en desarrollo. Por ahora puede eliminar y volver a crear la receta.');
        // Implementación completa requeriría un formulario de edición similar al de creación
    };
    
    window.deleteRecipe = function(id) {
        if (confirm('¿Está seguro que desea eliminar esta receta?')) {
            recipes = recipes.filter(r => r.id !== id);
            saveRecipes();
            loadRecipes();
            updateIngredientDropdowns();
        }
    };
});
