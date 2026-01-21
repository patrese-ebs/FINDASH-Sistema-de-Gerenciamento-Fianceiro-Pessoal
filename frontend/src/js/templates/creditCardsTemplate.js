// Credit Cards Section HTML - Insert after expenses section
const creditCardsSectionHTML = `
<!-- Credit Cards Section -->
<div id="cardsSection" class="hidden">
  <!-- Add Card Button -->
  <div class="mb-6 flex gap-3">
    <button id="addCreditCardBtn" class="btn-secondary">+ Novo Cartão</button>
    <button id="addCardExpenseBtn" class="btn-primary">+ Nova Despesa no Cartão</button>
  </div>

  <!-- Credit Cards Grid -->
  <div id="cardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    <!-- Cards will be inserted here -->
  </div>

  <!-- Invoice Section -->
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-bold">Fatura do Mês</h3>
      <button class="text-sm text-accent-purple hover:underline">📤 Exportar</button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-dark-border">
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">DATA</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">DESCRIÇÃO</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">CATEGORIA</th>
            <th class="text-left py-3 px-4 text-sm font-medium text-text-secondary">PARC.</th>
            <th class="text-right py-3 px-4 text-sm font-medium text-text-secondary">VALOR</th>
          </tr>
        </thead>
        <tbody id="invoiceTableBody">
          <tr>
            <td colspan="5" class="text-center py-8 text-text-secondary">Nenhuma transação encontrada</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
`;

// Add Card Transaction Modal HTML
const addCardTransactionModalHTML = `
<div id="addCardTransactionModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
  <div class="card max-w-md w-full m-4 fade-in">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-xl font-bold">Nova Despesa no Cartão</h3>
      <button id="closeCardTransactionModalBtn" class="text-text-secondary hover:text-text-primary">✕</button>
    </div>

    <form id="cardTransactionForm" class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Cartão</label>
        <select id="cardSelect" class="input-field w-full" required>
          <option value="">Selecione um cartão</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Descrição</label>
        <input type="text" id="cardDescription" class="input-field w-full" placeholder="Ex: TV Samsung" required>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-2">Valor Total</label>
          <input type="number" id="cardTotalAmount" class="input-field w-full" placeholder="1200.00" step="0.01" required>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">Parcelas</label>
          <select id="cardInstallments" class="input-field w-full" required>
            <option value="1">1x (à vista)</option>
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="4">4x</option>
            <option value="5">5x</option>
            <option value="6">6x</option>
            <option value="7">7x</option>
            <option value="8">8x</option>
            <option value="9">9x</option>
            <option value="10">10x</option>
            <option value="11">11x</option>
            <option value="12">12x</option>
            <option value="18">18x</option>
            <option value="24">24x</option>
          </select>
        </div>
      </div>

      <div id="cardInstallmentPreview" class="bg-dark-bg rounded-lg p-4 hidden">
        <div class="text-sm text-text-secondary mb-1">Valor da parcela:</div>
        <div class="text-2xl font-bold text-accent-purple" id="cardInstallmentAmount">R$ 0,00</div>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Categoria</label>
        <select id="cardCategory" class="input-field w-full" required>
          <option value="Eletrônicos">📱 Eletrônicos</option>
          <option value="Alimentação">🍔 Alimentação</option>
          <option value="Transporte">🚗 Transporte</option>
          <option value="Casa">🏠 Casa</option>
          <option value="Serviços">💼 Serviços</option>
          <option value="Outros">📦 Outros</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Data da Compra</label>
        <input type="date" id="cardPurchaseDate" class="input-field w-full" required>
      </div>

      <div class="flex gap-3 pt-4">
        <button type="button" id="cancelCardTransactionBtn" class="btn-secondary flex-1">Cancelar</button>
        <button type="submit" class="btn-primary flex-1">Adicionar Despesa</button>
      </div>
    </form>
  </div>
</div>
`;

export { creditCardsSectionHTML, addCardTransactionModalHTML };
