          {/* Notification Settings - Simple List */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <div style={{ marginBottom: '1rem' }}>
              <Text as="h4" variant="headingSm" fontWeight="semibold">
                Notifications
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" style={{ marginTop: '0.25rem' }}>
                Configure alerts for stock changes
              </Text>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Email Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px' }}>📧</span>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>Email Alerts</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {localNotificationSettings.email.enabled && localNotificationSettings.email.recipientEmail
                        ? `Sending to ${localNotificationSettings.email.recipientEmail}`
                        : 'Configure email notifications'
                      }
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setActiveNotificationModal('email');
                      setShowNotificationSettings(true);
                    }}
                  >
                    Configure
                  </button>
                  
                  <div
                    style={{
                      width: '36px',
                      height: '20px',
                      backgroundColor: localNotificationSettings.email.enabled ? '#059669' : '#d1d5db',
                      borderRadius: '10px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => {
                      handleNotificationSettingChange('email', 'enabled', !localNotificationSettings.email.enabled);
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: localNotificationSettings.email.enabled ? '18px' : '2px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Slack Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px' }}>📱</span>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>Slack Alerts</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {localNotificationSettings.slack.enabled && localNotificationSettings.slack.webhookUrl
                        ? 'Connected to Slack workspace'
                        : 'Configure Slack webhook'
                      }
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setActiveNotificationModal('slack');
                      setShowNotificationSettings(true);
                    }}
                  >
                    Configure
                  </button>
                  
                  <div
                    style={{
                      width: '36px',
                      height: '20px',
                      backgroundColor: localNotificationSettings.slack.enabled ? '#059669' : '#d1d5db',
                      borderRadius: '10px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => {
                      handleNotificationSettingChange('slack', 'enabled', !localNotificationSettings.slack.enabled);
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: localNotificationSettings.slack.enabled ? '18px' : '2px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Discord Row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '16px' }}>🎮</span>
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>Discord Alerts</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {localNotificationSettings.discord.enabled && localNotificationSettings.discord.webhookUrl
                        ? 'Connected to Discord server'
                        : 'Configure Discord webhook'
                      }
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    style={{
                      padding: '4px 12px',
                      fontSize: '12px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setActiveNotificationModal('discord');
                      setShowNotificationSettings(true);
                    }}
                  >
                    Configure
                  </button>
                  
                  <div
                    style={{
                      width: '36px',
                      height: '20px',
                      backgroundColor: localNotificationSettings.discord.enabled ? '#059669' : '#d1d5db',
                      borderRadius: '10px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => {
                      handleNotificationSettingChange('discord', 'enabled', !localNotificationSettings.discord.enabled);
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: localNotificationSettings.discord.enabled ? '18px' : '2px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
