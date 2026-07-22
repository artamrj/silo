/*
 * Container health check for the Silo HTTP endpoint.
 */
package main

import (
	"crypto/tls"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	// Detect a Kubernetes-injected service value before reading the port.
	// See https://github.com/louislam/uptime-kuma/pull/2083
	isK8s := strings.HasPrefix(os.Getenv("SILO_PORT"), "tcp://")

	// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{
		InsecureSkipVerify: true,
	}

	client := http.Client{
		Timeout: 28 * time.Second,
	}

	sslKey := os.Getenv("SILO_SSL_KEY")
	sslCert := os.Getenv("SILO_SSL_CERT")

	hostname := os.Getenv("SILO_HOSTNAME")
	if len(hostname) == 0 {
		hostname = "127.0.0.1"
	}

	port := ""
	// SILO_PORT can be overridden by Kubernetes service discovery.
	if !isK8s {
		port = os.Getenv("SILO_PORT")
	}
	if len(port) == 0 {
		port = "5001"
	}

	protocol := ""
	if len(sslKey) != 0 && len(sslCert) != 0 {
		protocol = "https"
	} else {
		protocol = "http"
	}

	url := protocol + "://" + hostname + ":" + port

	log.Println("Checking " + url)
	resp, err := client.Get(url)

	if err != nil {
		log.Fatalln(err)
	}

	defer resp.Body.Close()

	_, err = ioutil.ReadAll(resp.Body)

	if err != nil {
		log.Fatalln(err)
	}

	log.Printf("Health Check OK [Res Code: %d]\n", resp.StatusCode)

}
