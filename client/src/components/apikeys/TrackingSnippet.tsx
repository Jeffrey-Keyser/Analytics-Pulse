import React, { useState } from 'react';
import { Card, Text, Button, Alert } from '@jeffrey-keyser/personal-ui-kit';

interface TrackingSnippetProps {
  apiKey: string;
  projectId: string;
}

export function TrackingSnippet({ apiKey, projectId }: TrackingSnippetProps) {
  const [copied, setCopied] = useState(false);

  const generateSnippet = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `<!-- Analytics Pulse Tracking Script -->
<script>
  (function() {
    var apiKey = '${apiKey}';
    var projectId = '${projectId}';
    var baseUrl = '${baseUrl}';

    // Track page view
    function trackPageView() {
      fetch(baseUrl + '/api/v1/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({
          project_id: projectId,
          event_type: 'pageview',
          page_url: window.location.href,
          page_title: document.title,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      }).catch(function(err) {
        console.error('Analytics tracking error:', err);
      });
    }

    // Track on page load
    if (document.readyState === 'complete') {
      trackPageView();
    } else {
      window.addEventListener('load', trackPageView);
    }
  })();
</script>`;
  };

  const snippet = generateSnippet();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card variant="outlined" style={{ marginBottom: '2rem' }}>
      <div style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <Text variant="h3" style={{ margin: 0 }}>
            Tracking Code
          </Text>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </div>

        <Alert variant="info" style={{ marginBottom: '1rem' }}>
          Add this code to your website's HTML, just before the closing &lt;/head&gt; tag.
        </Alert>

        <pre
          style={{
            backgroundColor: '#f5f5f5',
            padding: '1rem',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '0.875rem',
            margin: 0,
            border: '1px solid #e0e0e0',
          }}
        >
          <code>{snippet}</code>
        </pre>
      </div>
    </Card>
  );
}
