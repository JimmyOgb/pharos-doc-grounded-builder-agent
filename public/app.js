document.addEventListener('DOMContentLoaded', () => {
  const questionInput = document.getElementById('questionInput');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');

  const statusBanner = document.getElementById('statusBanner');
  const statusTitle = document.getElementById('statusTitle');
  const statusBadge = document.getElementById('statusBadge');
  const statusSummary = document.getElementById('statusSummary');
  const statusIcon = document.getElementById('statusIcon');

  const resultsGrid = document.getElementById('resultsGrid');
  const citationsList = document.getElementById('citationsList');
  const coverageBadge = document.getElementById('coverageBadge');
  const planContainer = document.getElementById('planContainer');
  const execList = document.getElementById('execList');
  const unsignedTxPanel = document.getElementById('unsignedTxPanel');
  const unsignedTxJson = document.getElementById('unsignedTxJson');
  const verificationDetails = document.getElementById('verificationDetails');

  // Pill click handlers
  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const query = pill.getAttribute('data-query');
      if (query) {
        questionInput.value = query;
        executeWorkflow(query);
      }
    });
  });

  submitBtn.addEventListener('click', () => {
    const query = questionInput.value.trim();
    if (query) {
      executeWorkflow(query);
    }
  });

  questionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const query = questionInput.value.trim();
      if (query) {
        executeWorkflow(query);
      }
    }
  });

  async function executeWorkflow(question) {
    submitBtn.disabled = true;
    btnText.textContent = 'Processing...';
    spinner.style.display = 'inline-block';

    statusBanner.style.display = 'none';
    resultsGrid.style.display = 'none';
    unsignedTxPanel.style.display = 'none';

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      renderResults(data);
    } catch (err) {
      alert(`Execution Error: ${err.message}`);
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Execute Workflow';
      spinner.style.display = 'none';
    }
  }

  function renderResults(data) {
    resultsGrid.style.display = 'grid';
    statusBanner.style.display = 'block';

    // 1. Status Banner
    const status = data.finalStatus || 'UNKNOWN';
    statusBadge.textContent = status;
    statusBadge.className = `status-pill status-${status.toLowerCase().replace(/_/g, '-')}`;
    statusSummary.textContent = data.summary || '';

    if (status === 'VERIFIED') {
      statusIcon.textContent = '✅';
      statusTitle.textContent = 'Workflow Verified On-Chain';
    } else if (status === 'AWAITING_USER_SIGNATURE') {
      statusIcon.textContent = '✍️';
      statusTitle.textContent = 'Transaction Prepared (Awaiting User Signature)';
    } else if (status === 'UNSUPPORTED') {
      statusIcon.textContent = '🛡️';
      statusTitle.textContent = 'Undocumented Operation Refused';
    } else {
      statusIcon.textContent = '⚠️';
      statusTitle.textContent = 'Execution Failed / Incomplete';
    }

    // 2. Citations
    citationsList.innerHTML = '';
    const citations = data.documentationSources || [];
    if (citations.length > 0) {
      coverageBadge.textContent = 'Documented';
      coverageBadge.className = 'tag tag-success';

      citations.forEach(cit => {
        const item = document.createElement('div');
        item.className = 'citation-item';
        item.innerHTML = `
          <div class="citation-header">
            <a href="${cit.url}" target="_blank" rel="noopener" class="citation-title">${escapeHtml(cit.title)} ↗</a>
            <span class="tag">docs.pharos.xyz</span>
          </div>
          <div class="citation-excerpt">${escapeHtml(cit.contentExcerpt)}</div>
        `;
        citationsList.appendChild(item);
      });
    } else {
      coverageBadge.textContent = 'Undocumented';
      coverageBadge.className = 'tag tag-danger';
      citationsList.innerHTML = `
        <div class="citation-item">
          <p style="color: var(--accent-red); font-size: 13px; font-weight: 500;">
            ⚠️ Official Docs MCP search returned zero documentation covering this request.
          </p>
          <p style="color: var(--text-secondary); font-size: 12px; margin-top: 6px;">
            Missing Coverage: ${escapeHtml(data.missingDocumentation || 'No documented procedure.')}
          </p>
        </div>
      `;
    }

    // 3. Execution Plan
    planContainer.innerHTML = '';
    if (data.actionPlan && data.actionPlan.steps) {
      const plan = data.actionPlan;
      const planHeader = document.createElement('div');
      planHeader.style.marginBottom = '12px';
      planHeader.innerHTML = `
        <div style="font-weight: 600; font-size: 14px; color: var(--accent-blue);">${escapeHtml(plan.workflowName)}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
          Target Network: ${escapeHtml(plan.targetNetwork)} (Chain ID ${plan.chainId})
        </div>
      `;
      planContainer.appendChild(planHeader);

      plan.steps.forEach(step => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'plan-step';
        stepDiv.innerHTML = `
          <div class="step-num">${step.stepNumber}</div>
          <div class="step-content">
            <div class="step-desc">${escapeHtml(step.description)}</div>
            <div class="step-meta">
              <span>Tool: <code>${escapeHtml(step.targetTool)}</code></span>
              <span>Type: <strong>${escapeHtml(step.stepType)}</strong></span>
            </div>
          </div>
        `;
        planContainer.appendChild(stepDiv);
      });
    } else {
      planContainer.innerHTML = `
        <div style="color: var(--text-secondary); font-size: 13px;">
          No execution plan generated. Safe refusal enforced due to undocumented operation.
        </div>
      `;
    }

    // 4. Execution Telemetry
    execList.innerHTML = '';
    const execs = data.executionResults || [];
    if (execs.length > 0) {
      execs.forEach(ex => {
        const item = document.createElement('div');
        item.className = 'exec-item';
        item.innerHTML = `
          <div class="exec-header">
            <span class="exec-tool">${escapeHtml(ex.tool)}()</span>
            <span class="${ex.success ? 'exec-badge-success' : 'tag tag-danger'}">
              ${ex.success ? '✓ SUCCESS' : '✗ FAILED'}
            </span>
          </div>
          <div class="exec-details">
            <pre>${escapeHtml(JSON.stringify(ex.decodedOutput || ex.rawOutput, null, 2))}</pre>
          </div>
        `;
        execList.appendChild(item);
      });
    } else {
      execList.innerHTML = `
        <div style="color: var(--text-secondary); font-size: 13px;">
          Zero chain tools executed. Safety guardrail prevented execution.
        </div>
      `;
    }

    // Unsigned Tx panel
    if (data.unsignedTransaction) {
      unsignedTxPanel.style.display = 'block';
      unsignedTxJson.textContent = JSON.stringify(data.unsignedTransaction, null, 2);
    }

    // 5. Verification Panel
    const ver = data.verification || {};
    verificationDetails.innerHTML = `
      <div class="verify-item">
        <div class="verify-label">Planned Outcome:</div>
        <div class="verify-val">${escapeHtml(ver.plannedOutcome || 'N/A')}</div>
      </div>
      <div class="verify-item">
        <div class="verify-label">Actual Outcome:</div>
        <div class="verify-val">${escapeHtml(ver.actualOutcome || 'N/A')}</div>
      </div>
      <div class="verify-item">
        <div class="verify-label">Verification Evidence:</div>
        <div class="verify-val">${escapeHtml(ver.evidenceDetails || 'N/A')}</div>
      </div>
      ${
        ver.explorerUrl
          ? `
        <div class="verify-item">
          <div class="verify-label">Official Explorer Reference:</div>
          <div class="verify-val">
            <a href="${ver.explorerUrl}" target="_blank" rel="noopener" style="color: var(--accent-cyan); text-decoration: none;">
              ${ver.explorerUrl} ↗
            </a>
          </div>
        </div>
      `
          : ''
      }
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
